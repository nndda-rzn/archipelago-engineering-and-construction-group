import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { decodeCursor, encodeCursor, keysetWhere } from '@/shared/utils/keyset-cursor';
import type { ListStockLedgerQueryDto } from '../../presentation/dto/inventory.dto';

@Injectable()
export class StockLedgerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listStockLedger(query: ListStockLedgerQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const baseWhere: Prisma.StockLedgerEntryWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.wbsItemId ? { wbsItemId: query.wbsItemId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
    };

    const include = { project: { select: { code: true } }, wbsItem: { select: { code: true, name: true } }, warehouse: { select: { code: true, name: true } } } as const;

    // Mode keyset: stabil & efisien untuk tabel yang tumbuh tak terbatas (ledger).
    if (query.cursor) {
      const take = Math.min(Number(query.take) || pageSize, 200);
      const decoded = decodeCursor(query.cursor);
      if (!decoded) {
        // Cursor rusak -> fallback halaman pertama keyset (tanpa error ke client).
        const rows = await this.prisma.stockLedgerEntry.findMany({
          where: baseWhere,
          include,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: take + 1,
        });
        return this.keysetResult(rows, take);
      }

      const rows = await this.prisma.stockLedgerEntry.findMany({
        where: keysetWhere(baseWhere, decoded),
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: take + 1,
      });
      return this.keysetResult(rows, take);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockLedgerEntry.findMany({
        where: baseWhere,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stockLedgerEntry.count({ where: baseWhere }),
    ]);

    const last = items.length > 0 ? items[items.length - 1] : undefined;
    const nextCursor = items.length === pageSize && last ? this.cursorOf(last) : null;
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize), nextCursor };
  }

  private cursorOf(row: { createdAt: Date; id: string }): string {
    return encodeCursor({ createdAt: row.createdAt, id: row.id });
  }

  private keysetResult<T extends { createdAt: Date; id: string }>(rows: T[], take: number) {
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const last = items.length > 0 ? items[items.length - 1] : undefined;
    const nextCursor = hasMore && last ? this.cursorOf(last) : null;
    return { items, nextCursor };
  }

  async stockSummary(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const groups = await this.prisma.stockLedgerEntry.groupBy({
      by: ['wbsItemId', 'warehouseId'],
      where: { projectId },
      _sum: { quantity: true, totalValue: true },
    });

    const wbsIds = [...new Set(groups.map((g) => g.wbsItemId).filter((x): x is string => !!x))];
    const warehouseIds = [...new Set(groups.map((g) => g.warehouseId))];
    const [wbsItems, warehouses] = await Promise.all([
      wbsIds.length ? this.prisma.wbsItem.findMany({ where: { id: { in: wbsIds } }, select: { id: true, code: true, name: true } }) : [],
      warehouseIds.length ? this.prisma.warehouse.findMany({ where: { id: { in: warehouseIds } }, select: { id: true, code: true, name: true } }) : [],
    ]);
    const wbsMap = new Map(wbsItems.map((w) => [w.id, w]));
    const whMap = new Map(warehouses.map((w) => [w.id, w]));

    return {
      projectId,
      items: groups
        .map((g) => ({
          wbsItemId: g.wbsItemId,
          wbsItem: g.wbsItemId ? { code: wbsMap.get(g.wbsItemId)?.code ?? '-', name: wbsMap.get(g.wbsItemId)?.name ?? '-' } : null,
          warehouseId: g.warehouseId,
          warehouse: { code: whMap.get(g.warehouseId)?.code ?? '-', name: whMap.get(g.warehouseId)?.name ?? '-' },
          quantity: Number(g._sum.quantity ?? 0),
          totalValue: Number(g._sum.totalValue ?? 0),
        }))
        .filter((i) => i.quantity !== 0),
    };
  }
}