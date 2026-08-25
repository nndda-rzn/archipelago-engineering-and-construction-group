import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateStockTransferDto, ListStockTransferQueryDto } from '../dto/inventory.dto';

@Injectable()
export class StockTransferService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createStockTransfer(dto: CreateStockTransferDto, actorId: string) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException({ code: 'SAME_WAREHOUSE', message: 'Warehouse asal dan tujuan harus berbeda' });
    }

    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const [fromWh, toWh] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: dto.fromWarehouseId } }),
      this.prisma.warehouse.findUnique({ where: { id: dto.toWarehouseId } }),
    ]);
    if (!fromWh || !toWh) throw new NotFoundException({ code: 'WAREHOUSE_NOT_FOUND', message: 'Warehouse tidak ditemukan' });

    for (const item of dto.items) {
      if (!item.wbsItemId) continue;
      const wbs = await this.prisma.wbsItem.findUnique({ where: { id: item.wbsItemId } });
      if (!wbs || wbs.projectId !== dto.projectId) {
        throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: `WBS ${item.wbsItemId} tidak ada di project ini` });
      }
    }

    // Cek stok cukup di warehouse asal (anti over-transfer)
    for (const item of dto.items) {
      const agg = await this.prisma.stockLedgerEntry.aggregate({
        where: { projectId: dto.projectId, warehouseId: dto.fromWarehouseId, wbsItemId: item.wbsItemId ?? null },
        _sum: { quantity: true, totalValue: true },
      });
      const onHand = Number(agg._sum.quantity ?? 0);
      if (Number(item.quantity) > onHand) {
        throw new ConflictException({
          code: 'INSUFFICIENT_STOCK',
          message: `Stok tidak cukup di ${fromWh.code} untuk "${item.description}" (tersedia ${onHand} ${item.unit ?? 'EA'})`,
        });
      }
    }

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'ST' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'ST', prefix: `ST-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const transfer = await this.prisma.$transaction(async (tx) => {
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

      // Hitung saldo semua bucket (source OUT + target IN)
      const bucketKeys = new Set<string>();
      for (const item of created.items) {
        bucketKeys.add(`${dto.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.fromWarehouseId}`);
        bucketKeys.add(`${dto.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.toWarehouseId}`);
      }
      const balances: Record<string, number> = {};
      for (const key of bucketKeys) {
        const [projectId, wbsItemId, warehouseId] = key.split('|');
        const agg = await tx.stockLedgerEntry.aggregate({
          where: { projectId, warehouseId, wbsItemId: wbsItemId === 'NULL' ? null : wbsItemId },
          _sum: { quantity: true },
        });
        balances[key] = Number(agg._sum.quantity ?? 0);
      }

      const ledgerRows: Prisma.StockLedgerEntryCreateManyInput[] = [];
      for (const item of created.items) {
        const outKey = `${dto.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.fromWarehouseId}`;
        const inKey = `${dto.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.toWarehouseId}`;
        const outBalance = (balances[outKey] ?? 0) - Number(item.quantity);
        const inBalance = (balances[inKey] ?? 0) + Number(item.quantity);
        balances[outKey] = outBalance;
        balances[inKey] = inBalance;

        ledgerRows.push({
          projectId: dto.projectId,
          wbsItemId: item.wbsItemId ?? null,
          warehouseId: dto.fromWarehouseId,
          documentType: 'TRANSFER_OUT',
          documentId: item.id,
          reference: seq,
          description: `Transfer ke ${toWh.code}`,
          movementType: 'OUT',
          quantity: -Number(item.quantity),
          unit: item.unit,
          balanceAfter: String(outBalance),
        });
        ledgerRows.push({
          projectId: dto.projectId,
          wbsItemId: item.wbsItemId ?? null,
          warehouseId: dto.toWarehouseId,
          documentType: 'TRANSFER_IN',
          documentId: item.id,
          reference: seq,
          description: `Transfer dari ${fromWh.code}`,
          movementType: 'IN',
          quantity: Number(item.quantity),
          unit: item.unit,
          balanceAfter: String(inBalance),
        });
      }
      await tx.stockLedgerEntry.createMany({ data: ledgerRows });

      return created;
    });

    await this.audit.record({
      userId: actorId,
      action: 'StockTransfer.CREATE',
      resource: 'StockTransfer',
      resourceId: transfer.id,
      newValue: { transferNumber: seq, from: fromWh.code, to: toWh.code, itemCount: transfer.items.length },
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
        include: {
          items: true,
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