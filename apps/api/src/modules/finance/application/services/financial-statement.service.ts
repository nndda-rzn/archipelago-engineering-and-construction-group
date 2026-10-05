import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { periodWhere } from './period-close.service';
import type { FinancialStatementQueryDto } from '../../presentation/dto/finance-closure.dto';

@Injectable()
export class FinancialStatementService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async statementRows(query: FinancialStatementQueryDto) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: query.legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'ENTITY_NOT_FOUND', message: 'Legal entity not found' });

    const rows = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: { journal: periodWhere(query.legalEntityId, query.from, query.to) },
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
        return { accountId: account.id, code: account.code, name: account.name, accountType: account.accountType, debit, credit, balance: debit - credit };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .sort((a, b) => a.code.localeCompare(b.code));

    return { entity, lines };
  }

  async incomeStatement(query: FinancialStatementQueryDto) {
    const { entity, lines } = await this.statementRows(query);
    const revenue = lines.filter((l) => l.accountType === 'REVENUE').map((l) => ({ ...l, amount: l.credit - l.debit }));
    const expenses = lines.filter((l) => l.accountType === 'EXPENSE').map((l) => ({ ...l, amount: l.debit - l.credit }));
    const totalRevenue = revenue.reduce((s, l) => s + l.amount, 0);
    const totalExpense = expenses.reduce((s, l) => s + l.amount, 0);
    const netIncome = totalRevenue - totalExpense;
    return {
      legalEntityId: entity.id, legalEntityCode: entity.code, legalName: entity.legalName,
      from: query.from ?? null, to: query.to ?? null,
      revenue, expenses,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      generatedAt: new Date().toISOString(),
    };
  }

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
      legalEntityId: entity.id, legalEntityCode: entity.code, legalName: entity.legalName,
      from: query.from ?? null, to: query.to ?? null,
      assets, liabilities, equities,
      totalAsset: Math.round(totalAsset * 100) / 100,
      totalLiability: Math.round(totalLiability * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      totalLiabEquity: Math.round(totalLiabEquity * 100) / 100,
      balanced: Math.abs(totalAsset - totalLiabEquity) < 0.001,
      generatedAt: new Date().toISOString(),
    };
  }
}
