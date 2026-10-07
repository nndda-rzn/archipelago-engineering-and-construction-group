import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { decodeCursor, encodeCursor, keysetWhere } from '@/shared/utils/keyset-cursor';
import { AnalyticsEventsService } from '@/shared/events/analytics-events.service';

export interface AuditEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  source?: string;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AnalyticsEventsService) private readonly events: AnalyticsEventsService,
  ) {}

  async record(entry: AuditEntry) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          oldValue: entry.oldValue !== undefined ? (entry.oldValue as Prisma.InputJsonValue) : Prisma.JsonNull,
          newValue: entry.newValue !== undefined ? (entry.newValue as Prisma.InputJsonValue) : Prisma.JsonNull,
          reason: entry.reason ?? null,
          source: entry.source ?? 'api',
          correlationId: entry.correlationId ?? null,
        },
      });
      // FR-DASH-011: setiap mutasi memancarkan sinyal perubahan sehingga dashboard
      // memuat ulang angka tanpa polling buta. Publish tidak boleh memblokir audit:
      // kegagalan Redis ditelan di dalam service.
      await this.events.publish('analytics');
    } catch (error) {

      this.logger.error(`Gagal mencatat audit ${entry.action}: ${(error as Error).message}`);
    }
  }

  async findAll(query: { page?: number; pageSize?: number; action?: string; resource?: string; cursor?: string; take?: number }) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const baseWhere: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' as const } } : {}),
      ...(query.resource ? { resource: { contains: query.resource, mode: 'insensitive' as const } } : {}),
    };

    // Mode keyset: audit log tumbuh tak terbatas -> OFFSET makin lambat.
    if (query.cursor) {
      const take = Math.min(Number(query.take) || pageSize, 200);
      const decoded = decodeCursor(query.cursor);
      const where = decoded ? keysetWhere(baseWhere, decoded) : baseWhere;
      const rows = await this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: take + 1,
      });
      const hasMore = rows.length > take;
      const items = hasMore ? rows.slice(0, take) : rows;
      const last = items.length > 0 ? items[items.length - 1] : undefined;
      const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null;
      return { items, nextCursor };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where: baseWhere }),
    ]);

    const last = items.length > 0 ? items[items.length - 1] : undefined;
    const nextCursor = items.length === pageSize && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null;
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize), nextCursor };
  }
}
