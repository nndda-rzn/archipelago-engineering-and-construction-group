import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async portfolio() {
    const projects = await this.prisma.project.findMany({
      select: { id: true, code: true, name: true, client: true, contractValue: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    const [budgetAgg, ledgerAgg, invoiceAgg, clientInvoiceAgg] = await this.prisma.$transaction([
      this.prisma.budgetItem.groupBy({ by: ['projectId'], where: { status: 'PUBLISHED' }, orderBy: { projectId: 'asc' }, _sum: { amount: true } }),
      this.prisma.stockLedgerEntry.groupBy({ by: ['projectId'], where: { movementType: 'OUT', totalValue: { not: null } }, orderBy: { projectId: 'asc' }, _sum: { totalValue: true } }),
      this.prisma.journal.findMany({ where: { source: 'INVOICE', status: 'POSTED' }, select: { sourceId: true, lines: { where: { account: { code: { startsWith: '610' } } }, select: { debit: true } } } }),
      this.prisma.journal.findMany({ where: { source: 'CLIENT_INVOICE', status: 'POSTED' }, select: { sourceId: true, lines: { where: { account: { code: { startsWith: '410' } } }, select: { credit: true } } } }),
    ]);

    const budgetMap = new Map(budgetAgg.map((r) => [r.projectId, Number(r._sum?.amount ?? 0)]));
    const ledgerMap = new Map(ledgerAgg.map((r) => [r.projectId, Math.abs(Number(r._sum?.totalValue ?? 0))]));

    const [postedVendorInvoices, postedClientInvoices] = await this.prisma.$transaction([
      this.prisma.vendorInvoice.findMany({ where: { status: 'POSTED' }, select: { id: true, projectId: true } }),
      this.prisma.clientInvoice.findMany({ where: { status: 'POSTED' }, select: { id: true, projectId: true } }),
    ]);
    const vendorInvoiceProject = new Map(postedVendorInvoices.map((i) => [i.id, i.projectId]));
    const clientInvoiceProject = new Map(postedClientInvoices.map((i) => [i.id, i.projectId]));

    const invoiceCostByProject = new Map<string, number>();
    for (const j of invoiceAgg) {
      if (!j.sourceId) continue;
      const projectId = vendorInvoiceProject.get(j.sourceId);
      if (!projectId) continue;
      const v = j.lines.reduce((s, l) => s + Number(l.debit), 0);
      invoiceCostByProject.set(projectId, (invoiceCostByProject.get(projectId) ?? 0) + v);
    }
    const revenueByProject = new Map<string, number>();
    for (const j of clientInvoiceAgg) {
      if (!j.sourceId) continue;
      const projectId = clientInvoiceProject.get(j.sourceId);
      if (!projectId) continue;
      const v = j.lines.reduce((s, l) => s + Number(l.credit), 0);
      revenueByProject.set(projectId, (revenueByProject.get(projectId) ?? 0) + v);
    }

    let totalContract = 0;
    let totalBudget = 0;
    let totalActual = 0;
    let totalRevenue = 0;
    const countByHealth = { NO_BUDGET: 0, ON_TRACK: 0, AT_RISK: 0, CRITICAL: 0 };

    const items = projects.map((p) => {
      const budget = budgetMap.get(p.id) ?? 0;
      const actual = (ledgerMap.get(p.id) ?? 0) + (invoiceCostByProject.get(p.id) ?? 0);
      const revenue = revenueByProject.get(p.id) ?? 0;
      const utilization = budget > 0 ? Math.round((actual / budget) * 1000) / 10 : null;
      let health: 'NO_BUDGET' | 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
      if (budget === 0) health = 'NO_BUDGET';
      else if (utilization! <= 70) health = 'ON_TRACK';
      else if (utilization! <= 90) health = 'AT_RISK';
      else health = 'CRITICAL';
      countByHealth[health] += 1;

      totalContract += Number(p.contractValue ?? 0);
      totalBudget += budget;
      totalActual += actual;
      totalRevenue += revenue;

      return { projectId: p.id, projectCode: p.code, projectName: p.name, client: p.client, status: p.status, contractValue: Number(p.contractValue ?? 0), budget, actual, revenue, variance: budget - actual, utilization, health };
    });

    return {
      generatedAt: new Date().toISOString(),
      totals: { projectCount: projects.length, totalContract, totalBudget, totalActual, totalRevenue, totalVariance: totalBudget - totalActual },
      healthCounts: countByHealth,
      items,
    };
  }
}