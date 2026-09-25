import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { journalPeriodWhere, parsePeriod, periodRange } from '@/shared/utils/period';
import type { CompletePeriodStepDto, CreatePeriodCloseDto } from '../../presentation/dto/finance-closure.dto';

/**
 * Where-clause jurnal POSTED untuk **laporan ad-hoc** dengan rentang tanggal eksplisit
 * (mis. income statement `from`/`to`). Ini BUKAN untuk penutupan periode — penutupan
 * memakai `journalPeriodWhere` yang mengikat ke satu bulan buku.
 */
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

  async startPeriodClose(dto: CreatePeriodCloseDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    // Validasi format lebih awal; parsePeriod melempar INVALID_PERIOD bila bukan YYYY-MM.
    parsePeriod(dto.period);

    const existing = await this.prisma.periodClose.findUnique({ where: { legalEntityId_period: { legalEntityId: dto.legalEntityId, period: dto.period } } });
    if (existing) throw new ConflictException({ code: 'PERIOD_ALREADY_OPENED', message: `Periode ${dto.period} sudah dibuka` });

    // Hitung HANYA jurnal dalam rentang periode tersebut (sebelumnya tanpa batas tanggal).
    const journalCount = await this.prisma.journal.count({ where: journalPeriodWhere(dto.legalEntityId, dto.period) });

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

    // Draft dihitung HANYA untuk periode ini. Sebelumnya seluruh draft legal entity ikut dihitung,
    // sehingga draft bulan lain memblokir penutupan bulan berjalan (T6).
    const { gte, lt } = periodRange(close.period);
    const draftCount = await this.prisma.journal.count({
      where: { legalEntityId: close.legalEntityId, status: 'DRAFT', date: { gte, lt } },
    });
    if (draftCount > 0) {
      throw new ConflictException({ code: 'JOURNAL_DRAFT_PENDING', message: `${draftCount} journal masih DRAFT pada periode ${close.period} — post dulu sebelum close` });
    }

    const journalCount = await this.prisma.journal.count({ where: journalPeriodWhere(close.legalEntityId, close.period) });

    // CAS: dua close paralel tidak boleh sama-sama menutup. Status diperiksa di dalam guard.
    const cas = await this.prisma.periodClose.updateMany({
      where: { id, status: 'IN_PROGRESS' },
      data: { status: 'CLOSED', journalCount, closedBy: actorId, closedAt: new Date() },
    });
    if (cas.count === 0) {
      throw new ConflictException({ code: 'NOT_IN_PROGRESS', message: `Period close harus IN_PROGRESS (${close.status})` });
    }
    const closed = await this.prisma.periodClose.findUniqueOrThrow({ where: { id } });

    await this.audit.record({ userId: actorId, action: 'PeriodClose.CLOSE', resource: 'PeriodClose', resourceId: id, newValue: { period: close.period, journalCount }, source: 'api' });
    return closed;
  }

  async lockPeriod(id: string, actorId: string) {
    const close = await this.prisma.periodClose.findUnique({ where: { id } });
    if (!close) throw new NotFoundException({ code: 'PERIOD_CLOSE_NOT_FOUND', message: 'Period close tidak ditemukan' });
    if (close.status !== 'CLOSED') {
      throw new ConflictException({ code: 'NOT_CLOSED', message: `Hanya CLOSED yang bisa dikunci (${close.status})` });
    }

    // CAS: dua lock paralel tidak boleh sama-sama menang.
    const cas = await this.prisma.periodClose.updateMany({
      where: { id, status: 'CLOSED' },
      data: { status: 'LOCKED' },
    });
    if (cas.count === 0) {
      throw new ConflictException({ code: 'NOT_CLOSED', message: `Hanya CLOSED yang bisa dikunci (${close.status})` });
    }
    const locked = await this.prisma.periodClose.findUniqueOrThrow({ where: { id } });

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
