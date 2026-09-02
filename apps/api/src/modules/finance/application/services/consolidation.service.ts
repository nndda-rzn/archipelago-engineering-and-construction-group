import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';

@Injectable()
export class ConsolidationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
