import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateStockOpnameDto } from '../../presentation/dto/inventory.dto';

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

    const opname = await this.prisma.$transaction(async (tx) => {
      const seqRow = await tx.numberSequence.upsert({
        where: { code: 'OPN' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'OPN', prefix: `OPN-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      const seq = `${seqRow.prefix}${String(seqRow.nextNumber - 1).padStart(6, '0')}`;

      // Satu groupBy untuk seluruh bucket, bukan aggregate per item (menghindari N+1 dan
      // memperpendek transaksi — penting di bawah serializable agar retry tidak membengkak).
      const bookAgg = await tx.stockLedgerEntry.groupBy({
        by: ['wbsItemId'],
        where: { projectId: dto.projectId, warehouseId: dto.warehouseId },
        _sum: { quantity: true },
      });
      const bookMap = new Map(bookAgg.map((a) => [a.wbsItemId ?? 'NULL', Number(a._sum.quantity ?? 0)]));

      const items = dto.items.map((i) => {
        const book = bookMap.get(i.wbsItemId ?? 'NULL') ?? 0;
        return {
          description: i.description,
          bookQuantity: book,
          actualQuantity: Number(i.actualQuantity),
          difference: Number(i.actualQuantity) - book,
          unit: i.unit ?? 'EA',
          wbsItemId: i.wbsItemId ?? null,
        };
      });

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

      // Satu upsert untuk seluruh adjustment (increment = jumlah diff), lalu nomor berurutan.
      const diffs = created.items.filter((i) => Number(i.difference) !== 0);
      if (diffs.length > 0) {
        const adjSeq = await tx.numberSequence.upsert({
          where: { code: 'ADJ' },
          update: { nextNumber: { increment: diffs.length } },
          create: { code: 'ADJ', prefix: `ADJ-${new Date().getFullYear()}-EPC-`, nextNumber: 1 + diffs.length },
        });
        // `nextNumber` setelah increment menunjuk nomor berikutnya-yang-akan-dipakai; nomor
        // pertama yang baru terpakai = nextNumber - diffs.length.
        const firstNumber = adjSeq.nextNumber - diffs.length;
        let offset = 0;
        for (const item of diffs) {
          await tx.stockAdjustment.create({
            data: {
              adjustmentNumber: `${adjSeq.prefix}${String(firstNumber + offset).padStart(6, '0')}`,
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
          offset += 1;
        }
      }

      return created;
    });

    await this.audit.record({
      userId: actorId,
      action: 'StockOpname.CREATE',
      resource: 'StockOpname',
      resourceId: opname.id,
      newValue: { opnameNumber: opname.opnameNumber, itemCount: opname.items.length, differenceCount: opname.items.filter((i) => Number(i.difference) !== 0).length },
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