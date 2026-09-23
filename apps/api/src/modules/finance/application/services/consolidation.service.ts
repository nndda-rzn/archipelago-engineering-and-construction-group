import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';

@Injectable()
export class ConsolidationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async consolidation() {
    const entities = await this.prisma.legalEntity.findMany({ select: { id: true, code: true, legalName: true } });

    // JournalLine tidak punya legalEntityId; tapi invariant: setiap line pakai akun milik
    // entity yang sama dengan journal-nya (dijamin journal.service createJournal).
    // Jadi group by accountId sekali lintas entity, lalu atribusi via account.legalEntityId.
    const grouped = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: { journal: { status: 'POSTED' } },
      _sum: { debit: true, credit: true },
    });
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { id: { in: grouped.map((r) => r.accountId) } },
      select: { id: true, accountType: true, legalEntityId: true },
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    const byEntity = new Map<string, { asset: number; liability: number; equity: number; revenue: number; expense: number }>();
    for (const e of entities) {
      byEntity.set(e.id, { asset: 0, liability: 0, equity: 0, revenue: 0, expense: 0 });
    }

    for (const row of grouped) {
      const account = accountMap.get(row.accountId);
      if (!account) continue;
      const bucket = byEntity.get(account.legalEntityId);
      if (!bucket) continue;
      const debit = Number(row._sum.debit ?? 0);
      const credit = Number(row._sum.credit ?? 0);
      const type = account.accountType;
      if (type === 'ASSET') bucket.asset += debit - credit;
      else if (type === 'LIABILITY') bucket.liability += credit - debit;
      else if (type === 'EQUITY') bucket.equity += credit - debit;
      else if (type === 'REVENUE') bucket.revenue += credit - debit;
      else if (type === 'EXPENSE') bucket.expense += debit - credit;
    }

    const perEntity = entities.map((e) => {
      const b = byEntity.get(e.id)!;
      return { entityCode: e.code, legalName: e.legalName, totalAsset: b.asset, totalLiability: b.liability, totalEquity: b.equity, totalRevenue: b.revenue, totalExpense: b.expense };
    });

    const icAgg = await this.prisma.intercompanyTransaction.aggregate({ where: { status: 'POSTED' }, _sum: { amount: true } });
    const elimination = Number(icAgg._sum?.amount ?? 0);

    const totalAsset = perEntity.reduce((s, e) => s + e.totalAsset, 0) - elimination;
    const totalLiability = perEntity.reduce((s, e) => s + e.totalLiability, 0) - elimination;
    const totalEquity = perEntity.reduce((s, e) => s + e.totalEquity, 0);
    const totalRevenue = perEntity.reduce((s, e) => s + e.totalRevenue, 0);
    const totalExpense = perEntity.reduce((s, e) => s + e.totalExpense, 0);

    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      entities: perEntity.map((e) => ({ ...e, totalAsset: round(e.totalAsset), totalLiability: round(e.totalLiability), totalEquity: round(e.totalEquity), totalRevenue: round(e.totalRevenue), totalExpense: round(e.totalExpense) })),
      elimination: round(elimination),
      totals: { totalAsset: round(totalAsset), totalLiability: round(totalLiability), totalEquity: round(totalEquity), totalRevenue: round(totalRevenue), totalExpense: round(totalExpense), netIncome: round(totalRevenue - totalExpense) },
      balanced: Math.abs(totalAsset - (totalLiability + totalEquity)) < 0.001,
      generatedAt: new Date().toISOString(),
    };
  }
}
