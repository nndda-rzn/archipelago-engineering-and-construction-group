import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class ProjectHealthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async health(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { legalEntity: { select: { code: true } } },
    });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const budgetItems = await this.prisma.budgetItem.findMany({ where: { projectId: id, status: 'PUBLISHED' } });
    const budgetByWbs = new Map<string, number>();
    let totalBudget = 0;
    for (const b of budgetItems) {
      const v = Number(b.amount);
      budgetByWbs.set(b.wbsItemId, (budgetByWbs.get(b.wbsItemId) ?? 0) + v);
      totalBudget += v;
    }

    const ledgerOut = await this.prisma.stockLedgerEntry.groupBy({
      by: ['wbsItemId'],
      where: { projectId: id, movementType: 'OUT', totalValue: { not: null } },
      orderBy: { wbsItemId: 'asc' },
      _sum: { totalValue: true },
    });
    const actualByWbs = new Map<string, number>();
    let ledgerActualTotal = 0;
    for (const row of ledgerOut) {
      const v = Math.abs(Number(row._sum?.totalValue ?? 0));
      ledgerActualTotal += v;
      if (!row.wbsItemId) continue;
      actualByWbs.set(row.wbsItemId, (actualByWbs.get(row.wbsItemId) ?? 0) + v);
    }

    const postedInvoices = await this.prisma.vendorInvoice.findMany({
      where: { projectId: id, status: 'POSTED' },
      select: { id: true },
    });
    const postedInvoiceIds = postedInvoices.map((i) => i.id);
    const invoicePost = postedInvoiceIds.length
      ? await this.prisma.journal.findMany({
          where: { source: 'INVOICE', status: 'POSTED', sourceId: { in: postedInvoiceIds } },
          include: { lines: { where: { account: { code: { startsWith: '610' } } }, select: { debit: true } } },
        })
      : [];
    const invoiceActual = invoicePost.reduce((sum, j) => sum + j.lines.reduce((s, l) => s + Number(l.debit), 0), 0);

    const totalActual = ledgerActualTotal + invoiceActual;

    const postedClientInvoices = await this.prisma.clientInvoice.findMany({
      where: { projectId: id, status: 'POSTED' },
      select: { id: true },
    });
    const postedClientInvoiceIds = postedClientInvoices.map((i) => i.id);
    const revenuePost = postedClientInvoiceIds.length
      ? await this.prisma.journal.findMany({
          where: { source: 'CLIENT_INVOICE', status: 'POSTED', sourceId: { in: postedClientInvoiceIds } },
          include: { lines: { where: { account: { code: { startsWith: '410' } } }, select: { credit: true } } },
        })
      : [];
    const revenue = revenuePost.reduce((sum, j) => sum + j.lines.reduce((s, l) => s + Number(l.credit), 0), 0);

    const wbs = await this.prisma.wbsItem.findMany({
      where: { projectId: id },
      select: { id: true, code: true, name: true, parentId: true },
      orderBy: { code: 'asc' },
    });

    const wbsRows = wbs.map((w) => {
      const budget = budgetByWbs.get(w.id) ?? 0;
      const actual = actualByWbs.get(w.id) ?? 0;
      const variance = budget - actual;
      return { id: w.id, code: w.code, name: w.name, parentId: w.parentId, budget, actual, variance, utilization: budget > 0 ? Math.round((actual / budget) * 1000) / 10 : null };
    });

    const utilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : null;
    let health: 'NO_BUDGET' | 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
    if (totalBudget === 0) health = 'NO_BUDGET';
    else if (utilization! <= 70) health = 'ON_TRACK';
    else if (utilization! <= 90) health = 'AT_RISK';
    else health = 'CRITICAL';

    return {
      projectId: id,
      projectCode: project.code,
      projectName: project.name,
      client: project.client,
      legalEntityCode: project.legalEntity.code,
      contractValue: Number(project.contractValue ?? 0),
      totalBudget,
      totalActual,
      revenue,
      variance: totalBudget - totalActual,
      utilization,
      health,
      wbs: wbsRows,
      generatedAt: new Date().toISOString(),
    };
  }
}