import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class TrialBalanceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async trialBalance(legalEntityId: string, from?: string, to?: string) {
    const entity = await this.prisma.legalEntity.findUnique({ where: { id: legalEntityId } });
    if (!entity) throw new NotFoundException({ code: 'LEGAL_ENTITY_NOT_FOUND', message: 'Legal entity tidak ditemukan' });

    const where: Prisma.JournalLineWhereInput = {
      journal: { legalEntityId, status: 'POSTED' },
      ...(from || to ? { journal: { legalEntityId, status: 'POSTED', date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } } : {}),
    };

    const rows = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where,
      _sum: { debit: true, credit: true },
    });

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { id: { in: rows.map((r) => r.accountId) } },
      select: { id: true, code: true, name: true, accountType: true, normalBalance: true },
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    let totalDebit = 0;
    let totalCredit = 0;
    const lines = rows
      .map((row) => {
        const account = accountMap.get(row.accountId);
        if (!account) return null;
        const debit = Number(row._sum.debit ?? 0);
        const credit = Number(row._sum.credit ?? 0);
        const balance = debit - credit;
        totalDebit += debit;
        totalCredit += credit;
        return { accountId: account.id, code: account.code, name: account.name, accountType: account.accountType, normalBalance: account.normalBalance, debit, credit, balance };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .sort((a, b) => a.code.localeCompare(b.code));

    return {
      legalEntityId,
      legalEntityCode: entity.code,
      generatedAt: new Date().toISOString(),
      from: from ?? null,
      to: to ?? null,
      totalDebit,
      totalCredit,
      balanced: Math.abs(totalDebit - totalCredit) < 0.001,
      lines,
    };
  }
}