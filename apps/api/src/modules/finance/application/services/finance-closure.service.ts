import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CompletePeriodStepDto, CreateIntercompanyDto, CreatePeriodCloseDto,
  FinancialStatementQueryDto, ListIntercompanyQueryDto,
} from '../../presentation/dto/finance-closure.dto';

@Injectable()
export class FinanceClosureService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private async nextNumber(code: string, prefix: string): Promise<string> {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code },
        update: { nextNumber: { increment: 1 } },
        create: { code, prefix, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });
    return seq;
  }

  private periodWhere(legalEntityId: string, from?: string, to?: string): Prisma.JournalWhereInput {
    return {
      legalEntityId,
      status: 'POSTED',
      ...(from || to
        ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    };
  }

  // ─── FR-FIN-009: Intercompany ───────────────────────────────────────────────

  async createIntercompany(dto: CreateIntercompanyDto, actorId: string) {
    if (dto.fromEntityId === dto.toEntityId) {
      throw new ConflictException({ code: 'SAME_ENTITY', message: 'Entity asal dan tujuan harus berbeda' });
    }
    const from = await this.prisma.legalEntity.findUnique({ where: { id: dto.fromEntityId } });
    const to = await this.prisma.legalEntity.findUnique({ where: { id: dto.toEntityId } });
    if (!from) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Entity asal tidak ditemukan' });
    if (!to) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Entity tujuan tidak ditemukan' });

    const transactionNumber = await this.nextNumber('IC', `IC-${new Date().getFullYear()}-`);

    const ic = await this.prisma.intercompanyTransaction.create({
      data: {
        transactionNumber,
        fromEntityId: dto.fromEntityId,
        toEntityId: dto.toEntityId,
        amount: dto.amount,
        currency: dto.currency ?? 'IDR',
        description: dto.description ?? null,
      },
    });

    await this.audit.record({ userId: actorId, action: 'Intercompany.CREATE', resource: 'IntercompanyTransaction', resourceId: ic.id, newValue: { transactionNumber, from: from.code, to: to.code, amount: Number(dto.amount) }, source: 'api' });
    return ic;
  }

  async postIntercompany(id: string, actorId: string) {
    const ic = await this.prisma.intercompanyTransaction.findUnique({ where: { id } });
    if (!ic) throw new NotFoundException({ code: 'IC_NOT_FOUND', message: 'Transaksi intercompany tidak ditemukan' });
    if (ic.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa diposting (${ic.status})` });
    }
    const posted = await this.prisma.intercompanyTransaction.update({
      where: { id },
      data: { status: 'POSTED', postedAt: new Date(), postedBy: actorId },
    });
    await this.audit.record({ userId: actorId, action: 'Intercompany.POST', resource: 'IntercompanyTransaction', resourceId: id, newValue: { transactionNumber: ic.transactionNumber, amount: Number(ic.amount) }, source: 'api' });
    return posted;
  }

  async listIntercompany(query: ListIntercompanyQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.IntercompanyTransactionWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.intercompanyTransaction.findMany({
        where,
        include: { fromEntity: { select: { code: true } }, toEntity: { select: { code: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.intercompanyTransaction.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-FIN-009: reconciliation — ringkas per pasangan entity, cek reciprocal
  async intercompanyReconciliation() {
    const posted = await this.prisma.intercompanyTransaction.findMany({
      where: { status: 'POSTED' },
      include: { fromEntity: { select: { code: true } }, toEntity: { select: { code: true } } },
    });

    const byPair = new Map<string, { fromCode: string; toCode: string; totalFrom: number; totalTo: number; count: number }>();
    for (const ic of posted) {
      const key = `${ic.fromEntityId}|${ic.toEntityId}`;
      const pair = byPair.get(key) ?? { fromCode: ic.fromEntity.code, toCode: ic.toEntity.code, totalFrom: 0, totalTo: 0, count: 0 };
      pair.totalFrom += Number(ic.amount);
      pair.totalTo += Number(ic.amount);
      pair.count += 1;
      byPair.set(key, pair);
    }

    const items = [...byPair.values()].map((p) => ({
      fromCode: p.fromCode,
      toCode: p.toCode,
      count: p.count,
      amount: Math.round(p.totalFrom * 100) / 100,
      // reciprocal: pasangan kebalikan harus sama besar
      reciprocalAmount: Math.round(p.totalTo * 100) / 100,
      reconciled: true,
    }));

    // cek reciprocal kebalikan (A→B vs B→A)
    const set = new Set(items.map((i) => `${i.fromCode}|${i.toCode}`));
    for (const i of items) {
      i.reconciled = set.has(`${i.toCode}|${i.fromCode}`);
    }

    const total = items.reduce((s, i) => s + i.amount, 0);
    return { items, total: Math.round(total * 100) / 100, generatedAt: new Date().toISOString() };
  }

  // ─── FR-FIN-010: Period Close ───────────────────────────────────────────────

  private readonly steps = ['cutoff', 'accrual', 'depreciation', 'revaluation', 'reconciliation', 'closing'];

  async startPeriodClose(dto: CreatePeriodCloseDto, actorId: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: dto.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const existing = await this.prisma.periodClose.findUnique({ where: { legalEntityId_period: { legalEntityId: dto.legalEntityId, period: dto.period } } });
    if (existing) throw new ConflictException({ code: 'PERIOD_ALREADY_OPENED', message: `Periode ${dto.period} sudah dibuka` });

    const journalCount = await this.prisma.journal.count({ where: this.periodWhere(dto.legalEntityId) });

    const close = await this.prisma.periodClose.create({
      data: {
        legalEntityId: dto.legalEntityId,
        period: dto.period,
        status: 'IN_PROGRESS',
        steps: Object.fromEntries(this.steps.map((s) => [s, false])),
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
    if (!this.steps.includes(dto.step)) {
      throw new ConflictException({ code: 'INVALID_STEP', message: `Step harus salah satu: ${this.steps.join(', ')}` });
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
    const incomplete = this.steps.filter((s) => !steps[s]);
    if (incomplete.length > 0) {
      throw new ConflictException({ code: 'STEPS_PENDING', message: `Step belum selesai: ${incomplete.join(', ')}` });
    }

    // guard: tidak boleh ada journal DRAFT di periode
    const draftCount = await this.prisma.journal.count({
      where: { legalEntityId: close.legalEntityId, status: 'DRAFT' },
    });
    if (draftCount > 0) {
      throw new ConflictException({ code: 'JOURNAL_DRAFT_PENDING', message: `${draftCount} journal masih DRAFT — post dulu sebelum close` });
    }

    const journalCount = await this.prisma.journal.count({ where: this.periodWhere(close.legalEntityId) });

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

  // ─── FR-FIN-012: Financial statements ───────────────────────────────────────

  private async statementRows(query: FinancialStatementQueryDto) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: query.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const rows = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: { journal: this.periodWhere(query.legalEntityId, query.from, query.to) },
      _sum: { debit: true, credit: true },
    });

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { id: { in: rows.map((r) => r.accountId) } },
      select: { id: true, code: true, name: true, accountType: true },
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    const lines = rows
      .map((row) => {
        const account = accountMap.get(row.accountId);
        if (!account) return null;
        const debit = Number(row._sum.debit ?? 0);
        const credit = Number(row._sum.credit ?? 0);
        return {
          accountId: account.id,
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          debit,
          credit,
          balance: debit - credit,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .sort((a, b) => a.code.localeCompare(b.code));

    return { entity, lines };
  }

  // Income statement: REVENUE (credit−debit) − EXPENSE (debit−credit) = net income
  async incomeStatement(query: FinancialStatementQueryDto) {
    const { entity, lines } = await this.statementRows(query);

    const revenue = lines.filter((l) => l.accountType === 'REVENUE').map((l) => ({ ...l, amount: l.credit - l.debit }));
    const expenses = lines.filter((l) => l.accountType === 'EXPENSE').map((l) => ({ ...l, amount: l.debit - l.credit }));

    const totalRevenue = revenue.reduce((s, l) => s + l.amount, 0);
    const totalExpense = expenses.reduce((s, l) => s + l.amount, 0);
    const netIncome = totalRevenue - totalExpense;

    return {
      legalEntityId: entity.id,
      legalEntityCode: entity.code,
      legalName: entity.legalName,
      from: query.from ?? null,
      to: query.to ?? null,
      revenue,
      expenses,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      generatedAt: new Date().toISOString(),
    };
  }

  // Balance sheet: ASSET (debit−credit) = LIABILITY + EQUITY (credit−debit)
  async balanceSheet(query: FinancialStatementQueryDto) {
    const { entity, lines } = await this.statementRows(query);

    const assets = lines.filter((l) => l.accountType === 'ASSET').map((l) => ({ ...l, amount: l.debit - l.credit }));
    const liabilities = lines.filter((l) => l.accountType === 'LIABILITY').map((l) => ({ ...l, amount: l.credit - l.debit }));
    const equities = lines.filter((l) => l.accountType === 'EQUITY').map((l) => ({ ...l, amount: l.credit - l.debit }));

    const totalAsset = assets.reduce((s, l) => s + l.amount, 0);
    const totalLiability = liabilities.reduce((s, l) => s + l.amount, 0);
    const totalEquity = equities.reduce((s, l) => s + l.amount, 0);
    const totalLiabEquity = totalLiability + totalEquity;

    return {
      legalEntityId: entity.id,
      legalEntityCode: entity.code,
      legalName: entity.legalName,
      from: query.from ?? null,
      to: query.to ?? null,
      assets,
      liabilities,
      equities,
      totalAsset: Math.round(totalAsset * 100) / 100,
      totalLiability: Math.round(totalLiability * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      totalLiabEquity: Math.round(totalLiabEquity * 100) / 100,
      balanced: Math.abs(totalAsset - totalLiabEquity) < 0.001,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── FR-FIN-011: Consolidation (intercompany elimination) ───────────────────

  async consolidation() {
    const entities = await this.prisma.legalEntity.findMany({ select: { id: true, code: true, legalName: true } });
    const perEntity: Array<{ entityCode: string; legalName: string; totalAsset: number; totalLiability: number; totalEquity: number; totalRevenue: number; totalExpense: number }> = [];

    for (const e of entities) {
      const rows = await this.prisma.journalLine.groupBy({
        by: ['accountId'],
        where: { journal: { legalEntityId: e.id, status: 'POSTED' } },
        _sum: { debit: true, credit: true },
      });
      const accounts = await this.prisma.chartOfAccount.findMany({
        where: { id: { in: rows.map((r) => r.accountId) } },
        select: { id: true, accountType: true },
      });
      const typeMap = new Map(accounts.map((a) => [a.id, a.accountType]));

      let asset = 0, liability = 0, equity = 0, revenue = 0, expense = 0;
      for (const row of rows) {
        const type = typeMap.get(row.accountId);
        if (!type) continue;
        const debit = Number(row._sum.debit ?? 0);
        const credit = Number(row._sum.credit ?? 0);
        if (type === 'ASSET') asset += debit - credit;
        else if (type === 'LIABILITY') liability += credit - debit;
        else if (type === 'EQUITY') equity += credit - debit;
        else if (type === 'REVENUE') revenue += credit - debit;
        else if (type === 'EXPENSE') expense += debit - credit;
      }
      perEntity.push({ entityCode: e.code, legalName: e.legalName, totalAsset: asset, totalLiability: liability, totalEquity: equity, totalRevenue: revenue, totalExpense: expense });
    }

    // Intercompany elimination: POSTED intercompany amount dikurangi dari total
    const icAgg = await this.prisma.intercompanyTransaction.aggregate({
      where: { status: 'POSTED' },
      _sum: { amount: true },
    });
    const elimination = Number(icAgg._sum?.amount ?? 0);

    const totalAsset = perEntity.reduce((s, e) => s + e.totalAsset, 0) - elimination;
    const totalLiability = perEntity.reduce((s, e) => s + e.totalLiability, 0) - elimination;
    const totalEquity = perEntity.reduce((s, e) => s + e.totalEquity, 0);
    const totalRevenue = perEntity.reduce((s, e) => s + e.totalRevenue, 0);
    const totalExpense = perEntity.reduce((s, e) => s + e.totalExpense, 0);

    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      entities: perEntity.map((e) => ({
        ...e,
        totalAsset: round(e.totalAsset),
        totalLiability: round(e.totalLiability),
        totalEquity: round(e.totalEquity),
        totalRevenue: round(e.totalRevenue),
        totalExpense: round(e.totalExpense),
      })),
      elimination: round(elimination),
      totals: {
        totalAsset: round(totalAsset),
        totalLiability: round(totalLiability),
        totalEquity: round(totalEquity),
        totalRevenue: round(totalRevenue),
        totalExpense: round(totalExpense),
        netIncome: round(totalRevenue - totalExpense),
      },
      balanced: Math.abs(totalAsset - (totalLiability + totalEquity)) < 0.001,
      generatedAt: new Date().toISOString(),
    };
  }
}
