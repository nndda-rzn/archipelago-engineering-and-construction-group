import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { StockLedgerWriter } from '@/shared/inventory/stock-ledger-writer';
import { withSerializableRetry } from '@/shared/database/serializable-tx';
import type { CreateStockTransferDto, ListStockTransferQueryDto } from '../../presentation/dto/inventory.dto';

@Injectable()
export class StockTransferService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(StockLedgerWriter) private readonly ledger: StockLedgerWriter,
  ) {}

  async createStockTransfer(dto: CreateStockTransferDto, actorId: string) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException({ code: 'SAME_WAREHOUSE', message: 'Source and target warehouse must differ' });
    }

    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const [fromWh, toWh] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: dto.fromWarehouseId } }),
      this.prisma.warehouse.findUnique({ where: { id: dto.toWarehouseId } }),
    ]);
    if (!fromWh || !toWh) throw new NotFoundException({ code: 'WAREHOUSE_NOT_FOUND', message: 'Warehouse not found' });

    const wbsIds = dto.items.filter((i) => i.wbsItemId).map((i) => i.wbsItemId!);
    if (wbsIds.length > 0) {
      const wbsItems = await this.prisma.wbsItem.findMany({ where: { id: { in: wbsIds } } });
      const wbsByProject = new Map(wbsItems.map((w) => [w.id, w.projectId]));
      for (const item of dto.items) {
        if (!item.wbsItemId) continue;
        const ownerProjectId = wbsByProject.get(item.wbsItemId);
        if (ownerProjectId !== dto.projectId) {
          throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: `WBS ${item.wbsItemId} not found in this project` });
        }
      }
    }

    const stockBuckets = dto.items.reduce<Map<string, { key: string; projectId: string; warehouseId: string; wbsItemId: string | null; requiredQty: number }>>((acc, item) => {
      const key = `${dto.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.fromWarehouseId}`;
      const cur = acc.get(key) ?? { key, projectId: dto.projectId, warehouseId: dto.fromWarehouseId, wbsItemId: item.wbsItemId ?? null, requiredQty: 0 };
      cur.requiredQty += Number(item.quantity);
      acc.set(key, cur);
      return acc;
    }, new Map());

    const bucketKeys = [...stockBuckets.values()];

    // Cek saldo + tulis dalam SATU transaksi Serializable: menutup TOCTOU — dua transfer
    // paralel tidak bisa sama-sama lolos cek saldo yang sama.
    const transfer = await withSerializableRetry(
      this.prisma,
      async (tx) => {
        const stockAggs = await tx.stockLedgerEntry.groupBy({
          by: ['projectId', 'warehouseId', 'wbsItemId'],
          where: {
            OR: bucketKeys.map((b) => ({ projectId: b.projectId, warehouseId: b.warehouseId, wbsItemId: b.wbsItemId })),
          },
          _sum: { quantity: true },
        });
        const stockMap = new Map(stockAggs.map((a) => [`${a.projectId}|${a.wbsItemId ?? 'NULL'}|${a.warehouseId}`, Number(a._sum.quantity ?? 0)]));

        for (const b of bucketKeys) {
          const onHand = stockMap.get(b.key) ?? 0;
          if (b.requiredQty > onHand) {
            throw new ConflictException({
              code: 'INSUFFICIENT_STOCK',
              message: `Insufficient stock at ${fromWh.code} (available ${onHand})`,
            });
          }
        }

        const s = await tx.numberSequence.upsert({
          where: { code: 'ST' },
          update: { nextNumber: { increment: 1 } },
          create: { code: 'ST', prefix: `ST-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
        });
        const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;

        const created = await tx.stockTransfer.create({
          data: {
            transferNumber: seq,
            projectId: dto.projectId,
            fromWarehouseId: dto.fromWarehouseId,
            toWarehouseId: dto.toWarehouseId,
            transferredBy: actorId,
            remark: dto.remark ?? null,
            items: {
              create: dto.items.map((i) => ({
                description: i.description,
                quantity: Number(i.quantity),
                unit: i.unit ?? 'EA',
                wbsItemId: i.wbsItemId ?? null,
              })),
            },
          },
          include: { items: true },
        });

        const ledgerLines = created.items.flatMap((item) => [
          {
            projectId: dto.projectId,
            wbsItemId: item.wbsItemId ?? null,
            warehouseId: dto.fromWarehouseId,
            documentType: 'TRANSFER_OUT',
            documentId: item.id,
            reference: seq,
            description: `Transfer ke ${toWh.code}`,
            movementType: 'TRANSFER_OUT' as const,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitPrice: null,
            totalValue: null,
          },
          {
            projectId: dto.projectId,
            wbsItemId: item.wbsItemId ?? null,
            warehouseId: dto.toWarehouseId,
            documentType: 'TRANSFER_IN',
            documentId: item.id,
            reference: seq,
            description: `Transfer dari ${fromWh.code}`,
            movementType: 'TRANSFER_IN' as const,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitPrice: null,
            totalValue: null,
          },
        ]);
        await this.ledger.write(tx, ledgerLines);

        return created;
      },
      { label: 'StockTransfer.create' },
    );

    await this.audit.record({
      userId: actorId,
      action: 'StockTransfer.CREATE',
      resource: 'StockTransfer',
      resourceId: transfer.id,
      newValue: { transferNumber: transfer.transferNumber, from: fromWh.code, to: toWh.code, itemCount: transfer.items.length },
      source: 'api',
    });

    return transfer;
  }

  async listStockTransfers(query: ListStockTransferQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.StockTransferWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockTransfer.findMany({
        where,
        select: {
          id: true,
          transferNumber: true,
          projectId: true,
          fromWarehouseId: true,
          toWarehouseId: true,
          status: true,
          remark: true,
          createdAt: true,
          items: { select: { id: true, description: true, quantity: true, unit: true, wbsItemId: true } },
          project: { select: { code: true, name: true } },
          fromWarehouse: { select: { code: true, name: true } },
          toWarehouse: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}