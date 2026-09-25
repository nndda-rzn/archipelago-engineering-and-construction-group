import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { StockLedgerWriter } from '@/shared/inventory/stock-ledger-writer';
import { withSerializableRetry } from '@/shared/database/serializable-tx';
import type { CreateStockAdjustmentDto } from '../../presentation/dto/inventory.dto';

@Injectable()
export class StockAdjustmentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(StockLedgerWriter) private readonly ledger: StockLedgerWriter,
  ) {}

  async createStockAdjustment(dto: CreateStockAdjustmentDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse) throw new NotFoundException({ code: 'WAREHOUSE_NOT_FOUND', message: 'Warehouse tidak ditemukan' });

    const wbsIds = dto.items.map((i) => i.wbsItemId).filter((id): id is string => Boolean(id));
    if (wbsIds.length > 0) {
      const wbsItems = await this.prisma.wbsItem.findMany({
        where: { id: { in: wbsIds }, projectId: dto.projectId },
        select: { id: true },
      });
      const validWbsIds = new Set(wbsItems.map((w) => w.id));
      for (const item of dto.items) {
        if (!item.wbsItemId) continue;
        if (!validWbsIds.has(item.wbsItemId)) {
          throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: `WBS ${item.wbsItemId} tidak ada di project ini` });
        }
      }
    }

    const adjustment = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'ADJ' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'ADJ', prefix: `ADJ-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
      return tx.stockAdjustment.create({
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
    });

    await this.audit.record({
      userId: actorId,
      action: 'StockAdjustment.CREATE',
      resource: 'StockAdjustment',
      resourceId: adjustment.id,
      newValue: { adjustmentNumber: adjustment.adjustmentNumber, reasonCode: dto.reasonCode, status: 'DRAFT' },
      source: 'api',
    });

    return adjustment;
  }

  async approveStockAdjustment(id: string, actorId: string) {
    // Status-check + validasi stok + tulis dalam SATU transaksi Serializable: menutup
    // (a) double-approve dan (b) oversell saat adjustment negatif disetujui (TOCTOU).
    const approved = await withSerializableRetry(
      this.prisma,
      async (tx) => {
        const adjustment = await tx.stockAdjustment.findUnique({ where: { id }, include: { items: true } });
        if (!adjustment) throw new NotFoundException({ code: 'ADJUSTMENT_NOT_FOUND', message: 'Adjustment tidak ditemukan' });
        if (adjustment.status !== 'DRAFT') {
          throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa di-approve (${adjustment.status})` });
        }

        const hasNegative = adjustment.items.some((item) => Number(item.quantity) < 0);
        if (hasNegative) {
          const agg = await tx.stockLedgerEntry.groupBy({
            by: ['wbsItemId'],
            where: { projectId: adjustment.projectId, warehouseId: adjustment.warehouseId },
            _sum: { quantity: true },
          });
          const onHand = new Map(agg.map((a) => [a.wbsItemId ?? 'NULL', Number(a._sum.quantity ?? 0)]));
          for (const item of adjustment.items) {
            if (Number(item.quantity) >= 0) continue;
            const avail = onHand.get(item.wbsItemId ?? 'NULL') ?? 0;
            if (Math.abs(Number(item.quantity)) > avail) {
              throw new ConflictException({ code: 'INSUFFICIENT_STOCK', message: `Adjustment "${item.description}" melebihi stok tersedia` });
            }
          }
        }

        const updated = await tx.stockAdjustment.update({
          where: { id },
          data: { status: 'APPROVED', approvedBy: actorId, approvedAt: new Date() },
          include: { items: true },
        });

        await this.ledger.write(tx, updated.items.map((item) => ({
          projectId: adjustment.projectId,
          wbsItemId: item.wbsItemId ?? null,
          warehouseId: adjustment.warehouseId,
          documentType: 'ADJUSTMENT',
          documentId: item.id,
          reference: adjustment.adjustmentNumber,
          description: `Adjustment ${adjustment.reasonCode}`,
          movementType: Number(item.quantity) >= 0 ? 'IN' as const : 'OUT' as const,
          quantity: Math.abs(Number(item.quantity)),
          unit: item.unit,
          unitPrice: null,
          totalValue: null,
        })));

        return updated;
      },
      { label: 'StockAdjustment.approve' },
    );

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