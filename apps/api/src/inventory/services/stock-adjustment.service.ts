import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { CreateStockAdjustmentDto } from '../dto/inventory.dto';

@Injectable()
export class StockAdjustmentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createStockAdjustment(dto: CreateStockAdjustmentDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse) throw new NotFoundException({ code: 'WAREHOUSE_NOT_FOUND', message: 'Warehouse tidak ditemukan' });

    for (const item of dto.items) {
      if (!item.wbsItemId) continue;
      const wbs = await this.prisma.wbsItem.findUnique({ where: { id: item.wbsItemId } });
      if (!wbs || wbs.projectId !== dto.projectId) {
        throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: `WBS ${item.wbsItemId} tidak ada di project ini` });
      }
    }

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'ADJ' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'ADJ', prefix: `ADJ-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const adjustment = await this.prisma.stockAdjustment.create({
      data: {
        adjustmentNumber: seq,
        projectId: dto.projectId,
        warehouseId: dto.warehouseId,
        reasonCode: dto.reasonCode,
        reason: dto.reason ?? null,
        adjustedBy: actorId,
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

    await this.audit.record({
      userId: actorId,
      action: 'StockAdjustment.CREATE',
      resource: 'StockAdjustment',
      resourceId: adjustment.id,
      newValue: { adjustmentNumber: seq, reasonCode: dto.reasonCode, status: 'DRAFT' },
      source: 'api',
    });

    return adjustment;
  }

  async approveStockAdjustment(id: string, actorId: string) {
    const adjustment = await this.prisma.stockAdjustment.findUnique({ where: { id }, include: { items: true } });
    if (!adjustment) throw new NotFoundException({ code: 'ADJUSTMENT_NOT_FOUND', message: 'Adjustment tidak ditemukan' });
    if (adjustment.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa di-approve (${adjustment.status})` });
    }

    // guard: stok tidak boleh negatif setelah adjustment (qty negative lebih besar dari on-hand)
    for (const item of adjustment.items) {
      if (Number(item.quantity) < 0) {
        const agg = await this.prisma.stockLedgerEntry.aggregate({
          where: { projectId: adjustment.projectId, warehouseId: adjustment.warehouseId, wbsItemId: item.wbsItemId ?? null },
          _sum: { quantity: true },
        });
        if (Number(item.quantity) < 0 && Math.abs(Number(item.quantity)) > Number(agg._sum.quantity ?? 0)) {
          throw new ConflictException({ code: 'INSUFFICIENT_STOCK', message: `Adjustment "${item.description}" melebihi stok tersedia` });
        }
      }
    }

    const approved = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.stockAdjustment.update({
        where: { id },
        data: { status: 'APPROVED', approvedBy: actorId, approvedAt: new Date() },
        include: { items: true },
      });

      // Ledger ADJUSTMENT (delta qty, bisa +/-)
      const bucketKeys = new Set<string>();
      for (const item of updated.items) {
        bucketKeys.add(`${adjustment.projectId}|${item.wbsItemId ?? 'NULL'}|${adjustment.warehouseId}`);
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
      for (const item of updated.items) {
        const key = `${adjustment.projectId}|${item.wbsItemId ?? 'NULL'}|${adjustment.warehouseId}`;
        const running = (balances[key] ?? 0) + Number(item.quantity);
        balances[key] = running;
        ledgerRows.push({
          projectId: adjustment.projectId,
          wbsItemId: item.wbsItemId ?? null,
          warehouseId: adjustment.warehouseId,
          documentType: 'ADJUSTMENT',
          documentId: item.id,
          reference: adjustment.adjustmentNumber,
          description: `Adjustment ${adjustment.reasonCode}`,
          movementType: Number(item.quantity) >= 0 ? 'IN' : 'OUT',
          quantity: Number(item.quantity),
          unit: item.unit,
          balanceAfter: String(running),
        });
      }
      await tx.stockLedgerEntry.createMany({ data: ledgerRows });

      return updated;
    });

    await this.audit.record({
      userId: actorId,
      action: 'StockAdjustment.APPROVE',
      resource: 'StockAdjustment',
      resourceId: id,
      newValue: { adjustmentNumber: approved.adjustmentNumber, itemCount: approved.items.length },
      source: 'api',
    });

    return approved;
  }

  async listStockAdjustments(query: { page?: number; pageSize?: number; projectId?: string }) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.StockAdjustmentWhereInput = { ...(query.projectId ? { projectId: query.projectId } : {}) };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockAdjustment.findMany({
        where,
        include: { items: true, project: { select: { code: true } }, warehouse: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stockAdjustment.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}