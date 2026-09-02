import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CompletePeriodStepDto, CreatePeriodCloseDto } from '../../presentation/dto/finance-closure.dto';

/** periodWhere utility — dipakai oleh PeriodCloseService dan FinancialStatementService */
export function periodWhere(legalEntityId: string, from?: string, to?: string): Prisma.JournalWhereInput {
  return {
    legalEntityId,
    status: 'POSTED',
    ...(from || to
      ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
      : {}),
  };
}

const PERIOD_STEPS = ['cutoff', 'accrual', 'depreciation', 'revaluation', 'reconciliation', 'closing'];

@Injectable()
export class PeriodCloseService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // FR-FIN-010: Period close lifecycle
  async startPeriodClose(dto: CreatePeriodCloseDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const existing = await this.prisma.periodClose.findUnique({ where: { legalEntityId_period: { legalEntityId: dto.legalEntityId, period: dto.period } } });
    if (existing) throw new ConflictException({ code: 'PERIOD_ALREADY_OPENED', message: `Periode ${dto.period} sudah dibuka` });

    const journalCount = await this.prisma.journal.count({ where: periodWhere(dto.legalEntityId) });

    const close = await this.prisma.periodClose.create({
      data: {
        legalEntityId: dto.legalEntityId,
        period: dto.period,
        status: 'IN_PROGRESS',
        steps: Object.fromEntries(PERIOD_STEPS.map((s) => [s, false])),
        journalCount,
      },
    });

    await this.audit.record({ userId: actorId, action: 'PeriodClose.START', resource: 'PeriodClose', resourceId: close.id, newValue: { entity: entity.code, period: dto.period, journalCount }, source: 'api' });
    return close;
  }

  async completeStep(id: string, dto: CompletePeriodStepDto, actorId: string) {
    const close = await this.prisma.periodClose.findUnique({ where: { id } });
    if (!close) throw new NotFoundException({ code: 'PERIOD_CLOSE_NOT_FOUND', message: 'Period close tidak ditemukan' });
    if (close.status !== 'IN_PROGRESS') {
      throw new ConflictException({ code: 'NOT_IN_PROGRESS', message: `Period close harus IN_PROGRESS (${close.status})` });
    }
    if (!PERIOD_STEPS.includes(dto.step)) {
      throw new ConflictException({ code: 'INVALID_STEP', message: `Step harus salah satu: ${PERIOD_STEPS.join(', ')}` });
    }
    const steps = (close.steps as Record<string, boolean> | null) ?? {};
    steps[dto.step] = true;

    const updated = await this.prisma.periodClose.update({ where: { id }, data: { steps } });
    await this.audit.record({ userId: actorId, action: 'PeriodClose.STEP', resource: 'PeriodClose', resourceId: id, newValue: { step: dto.step }, source: 'api' });
    return updated;
  }

  async closePeriod(id: string, actorId: string) {
    const close = await this.prisma.periodClose.findUnique({ where: { id } });
    if (!close) throw new NotFoundException({ code: 'PERIOD_CLOSE_NOT_FOUND', message: 'Period close tidak ditemukan' });
    if (close.status !== 'IN_PROGRESS') {
      throw new ConflictException({ code: 'NOT_IN_PROGRESS', message: `Period close harus IN_PROGRESS (${close.status})` });
    }
    const steps = (close.steps as Record<string, boolean> | null) ?? {};
    const incomplete = PERIOD_STEPS.filter((s) => !steps[s]);
    if (incomplete.length > 0) {
      throw new ConflictException({ code: 'STEPS_PENDING', message: `Step belum selesai: ${incomplete.join(', ')}` });
    }
    const draftCount = await this.prisma.journal.count({ where: { legalEntityId: close.legalEntityId, status: 'DRAFT' } });
    if (draftCount > 0) {
      throw new ConflictException({ code: 'JOURNAL_DRAFT_PENDING', message: `${draftCount} journal masih DRAFT — post dulu sebelum close` });
    }
    const journalCount = await this.prisma.journal.count({ where: periodWhere(close.legalEntityId) });
    const closed = await this.prisma.periodClose.update({
      where: { id },
      data: { status: 'CLOSED', journalCount, closedBy: actorId, closedAt: new Date() },
    });
    await this.audit.record({ userId: actorId, action: 'PeriodClose.CLOSE', resource: 'PeriodClose', resourceId: id, newValue: { period: close.period, journalCount }, source: 'api' });
    return closed;
  }

  async lockPeriod(id: string, actorId: string) {
    const close = await this.prisma.periodClose.findUnique({ where: { id } });
    if (!close) throw new NotFoundException({ code: 'PERIOD_CLOSE_NOT_FOUND', message: 'Period close tidak ditemukan' });
    if (close.status !== 'CLOSED') {
      throw new ConflictException({ code: 'NOT_CLOSED', message: `Hanya CLOSED yang bisa dikunci (${close.status})` });
    }
    const locked = await this.prisma.periodClose.update({ where: { id }, data: { status: 'LOCKED' } });
    await this.audit.record({ userId: actorId, action: 'PeriodClose.LOCK', resource: 'PeriodClose', resourceId: id, newValue: { period: close.period }, source: 'api' });
    return locked;
  }

  async listPeriodCloses() {
    const items = await this.prisma.periodClose.findMany({
      include: { legalEntity: { select: { code: true } } },
      orderBy: { period: 'desc' },
    });
    return { items, total: items.length };
  }
}
