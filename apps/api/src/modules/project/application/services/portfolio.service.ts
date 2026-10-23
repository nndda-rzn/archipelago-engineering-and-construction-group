import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ActualCostCalculator } from '@/shared/project/actual-cost.calculator';
import { classifyHealth } from '@/shared/project/project-health.classifier';

@Injectable()
export class PortfolioService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActualCostCalculator) private readonly actualCost: ActualCostCalculator,
  ) {}

  async portfolio(filter: { legalEntityId?: string } = {}) {
    const projects = await this.prisma.project.findMany({
      where: filter.legalEntityId ? { legalEntityId: filter.legalEntityId } : {},
      select: { id: true, code: true, name: true, client: true, contractValue: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    if (projects.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        totals: { projectCount: 0, totalContract: 0, totalBudget: 0, totalActual: 0, totalRevenue: 0, totalVariance: 0 },
        healthCounts: { NO_BUDGET: 0, ON_TRACK: 0, AT_RISK: 0, CRITICAL: 0 },
        items: [],
      };
    }

    const projectIds = projects.map((p) => p.id);

    const budgetAgg = await this.prisma.budgetItem.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds }, status: 'PUBLISHED' },
      _sum: { amount: true },
    });
    const budgetMap = new Map(budgetAgg.map((r) => [r.projectId, Number(r._sum?.amount ?? 0)]));

    const actualMap = await this.actualCost.computeBatch(projectIds);

    const postedClientInvoices = await this.prisma.clientInvoice.findMany({
      where: { projectId: { in: projectIds }, status: 'POSTED' },
      select: { id: true, projectId: true },
    });
    const clientInvoiceProjectMap = new Map(postedClientInvoices.map((i) => [i.id, i.projectId]));
    const revenueByProject = new Map<string, number>();
    if (postedClientInvoices.length > 0) {
      const revenueJournals = await this.prisma.journal.findMany({
        where: { source: 'CLIENT_INVOICE', status: 'POSTED', sourceId: { in: postedClientInvoices.map((i) => i.id) } },
        include: { lines: { where: { account: { code: { startsWith: '410' } } }, select: { credit: true } } },
      });
      for (const j of revenueJournals) {
        if (!j.sourceId) continue;
        const projectId = clientInvoiceProjectMap.get(j.sourceId);
        if (!projectId) continue;
        const v = j.lines.reduce((s, l) => s + Number(l.credit), 0);
        revenueByProject.set(projectId, (revenueByProject.get(projectId) ?? 0) + v);
      }
    }

    let totalContract = 0;
    let totalBudget = 0;
    let totalActual = 0;
    let totalRevenue = 0;
    const countByHealth = { NO_BUDGET: 0, ON_TRACK: 0, AT_RISK: 0, CRITICAL: 0 };

    const items = projects.map((p) => {
      const budget = budgetMap.get(p.id) ?? 0;
      const actual = actualMap.get(p.id) ?? 0;
      const revenue = revenueByProject.get(p.id) ?? 0;

      const utilization = budget > 0 ? (actual / budget) * 100 : null;
      // Portfolio tidak menghitung EV; status di sini hanya untuk pengelompokan,
      // dan halaman Health memakai endpoint portofolio khusus yang punya CPI/SPI.
      const { health } = classifyHealth(utilization == null ? null : actual / budget, null, utilization);
      countByHealth[health] += 1;

      totalContract += Number(p.contractValue ?? 0);
      totalBudget += budget;
      totalActual += actual;
      totalRevenue += revenue;

      return {
        projectId: p.id, projectCode: p.code, projectName: p.name, client: p.client,
        status: p.status, contractValue: Number(p.contractValue ?? 0),
        budget, actual, revenue, variance: budget - actual, utilization, health,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      totals: { projectCount: projects.length, totalContract, totalBudget, totalActual, totalRevenue, totalVariance: totalBudget - totalActual },
      healthCounts: countByHealth,
      items,
    };
  }
}
