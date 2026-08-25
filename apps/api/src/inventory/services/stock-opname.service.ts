import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/audit/audit.service';
import type { CreateStockOpnameDto } from '../dto/inventory.dto';

@Injectable()
export class StockOpnameService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createStockOpname(dto: CreateStockOpnameDto, actorId: string) {
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
        where: { code: 'OPN' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'OPN', prefix: `OPN-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    // bookQuantity diambil dari ledger saat opname (bukan input)
    const opname = await this.prisma.$transaction(async (tx) => {
      const items = await Promise.all(
        dto.items.map(async (i) => {
          const agg = await tx.stockLedgerEntry.aggregate({
            where: { projectId: dto.projectId, warehouseId: dto.warehouseId, wbsItemId: i.wbsItemId ?? null },
            _sum: { quantity: true },
          });
          const book = Number(agg._sum.quantity ?? 0);
          return {
            description: i.description,
            bookQuantity: book,
            actualQuantity: Number(i.actualQuantity),
            difference: Number(i.actualQuantity) - book,
            unit: i.unit ?? 'EA',
            wbsItemId: i.wbsItemId ?? null,
          };
        }),
      );

      const created = await tx.stockOpname.create({
        data: {
          opnameNumber: seq,
          projectId: dto.projectId,
          warehouseId: dto.warehouseId,
          countedBy: actorId,
          remark: dto.remark ?? null,
          items: { create: items },
        },
        include: { items: true },
      });

      // Reconciliation: selisih ≠ 0 → buat Adjustment DRAFT (perlu approval sebelum efek ke ledger)
      const diffs = created.items.filter((i) => Number(i.difference) !== 0);
      for (const item of diffs) {
        const adjSeq = await tx.numberSequence.upsert({
          where: { code: 'ADJ' },
          update: { nextNumber: { increment: 1 } },
          create: { code: 'ADJ', prefix: `ADJ-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
        });
        await tx.stockAdjustment.create({
          data: {
            adjustmentNumber: `${adjSeq.prefix}${String(adjSeq.nextNumber - 1).padStart(6, '0')}`,
            projectId: dto.projectId,
            warehouseId: dto.warehouseId,
            reasonCode: Number(item.difference) > 0 ? 'SURPLUS' : 'LOSS',
            reason: `Reconciliation opname ${seq}: ${item.description}`,
            adjustedBy: actorId,
            items: {
              create: {
                description: item.description,
                quantity: Number(item.difference),
                unit: item.unit,
                wbsItemId: item.wbsItemId,
              },
            },
          },
        });
      }

      return created;
    });

    await this.audit.record({
      userId: actorId,
      action: 'StockOpname.CREATE',
      resource: 'StockOpname',
      resourceId: opname.id,
      newValue: { opnameNumber: seq, itemCount: opname.items.length, differenceCount: opname.items.filter((i) => Number(i.difference) !== 0).length },
      source: 'api',
    });

    return opname;
  }

  async listStockOpnames(query: { page?: number; pageSize?: number; projectId?: string }) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.StockOpnameWhereInput = { ...(query.projectId ? { projectId: query.projectId } : {}) };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockOpname.findMany({
        where,
        include: { items: true, project: { select: { code: true } }, warehouse: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stockOpname.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}