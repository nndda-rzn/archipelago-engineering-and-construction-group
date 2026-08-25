import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';

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

/**
 * Audit trail — FR-FND-008, PRD §28.
 * Immutable record: actor, timestamp, action, old/new value, reason, correlation id.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
    } catch (error) {
      // Audit tidak boleh menggagalkan transaksi utama — log error saja (BR-015: audit tetap immutable)
      this.logger.error(`Gagal mencatat audit ${entry.action}: ${(error as Error).message}`);
    }
  }

  async findAll(query: { page?: number; pageSize?: number; action?: string; resource?: string }) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' as const } } : {}),
      ...(query.resource ? { resource: { contains: query.resource, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
