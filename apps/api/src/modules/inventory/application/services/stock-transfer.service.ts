import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateStockTransferDto, ListStockTransferQueryDto } from '../../presentation/dto/inventory.dto';

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

    // Batch validasi WBS (C2: hindari N+1 per item).
    const wbsIds = dto.items.filter((i) => i.wbsItemId).map((i) => i.wbsItemId!);
    if (wbsIds.length > 0) {
      const wbsItems = await this.prisma.wbsItem.findMany({ where: { id: { in: wbsIds } } });
      const wbsByProject = new Map(wbsItems.map((w) => [w.id, w.projectId]));
      for (const item of dto.items) {
        if (!item.wbsItemId) continue;
        const ownerProjectId = wbsByProject.get(item.wbsItemId);
        if (ownerProjectId !== dto.projectId) {
          throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: `WBS ${item.wbsItemId} tidak ada di project ini` });
        }
      }
    }

    // Batch cek stok (C2): aggregate stok per bucket asal via groupBy.
    const stockBuckets = dto.items.reduce<Map<string, { key: string; projectId: string; warehouseId: string; wbsItemId: string | null; requiredQty: number }>>((acc, item) => {
      const key = `${dto.projectId}|${item.wbsItemId ?? 'NULL'}|${dto.fromWarehouseId}`;
      const cur = acc.get(key) ?? { key, projectId: dto.projectId, warehouseId: dto.fromWarehouseId, wbsItemId: item.wbsItemId ?? null, requiredQty: 0 };
      cur.requiredQty += Number(item.quantity);
      acc.set(key, cur);
      return acc;
    }, new Map());

    const bucketKeys = [...stockBuckets.values()];
    const stockAggs = await this.prisma.stockLedgerEntry.groupBy({
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
          message: `Stok tidak cukup di ${fromWh.code} (tersedia ${onHand})`,
        });
      }
    }

    // Seq + create + ledger dalam SATU transaksi atomic (C1: hilangkan gap nomor & partial-failure).
    const transfer = await this.prisma.$transaction(async (tx) => {
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