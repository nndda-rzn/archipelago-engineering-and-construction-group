import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ActualCostCalculator } from '@/shared/project/actual-cost.calculator';
import { classifyHealth } from '@/shared/project/project-health.classifier';

@Injectable()
export class ProjectHealthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActualCostCalculator) private readonly actualCost: ActualCostCalculator,
  ) {}

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

    const totalActual = await this.actualCost.compute(id);

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

    const ledgerOut = await this.prisma.stockLedgerEntry.groupBy({
      by: ['wbsItemId'],
      where: { projectId: id, movementType: 'OUT', totalValue: { not: null } },
      orderBy: { wbsItemId: 'asc' },
      _sum: { totalValue: true },
    });
    const actualByWbs = new Map<string, number>();
    for (const row of ledgerOut) {
      if (!row.wbsItemId) continue;
      actualByWbs.set(row.wbsItemId, Math.abs(Number(row._sum?.totalValue ?? 0)));
    }

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

    const { utilization, health } = classifyHealth(totalBudget, totalActual);

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
