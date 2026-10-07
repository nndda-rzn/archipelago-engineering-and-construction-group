import { Inject, Injectable } from '@nestjs/common';
import type { AnalyticsFilterParams } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { analyticsCacheKey } from '@/shared/cache/analytics-cache';

/** Analitik biaya proyek: komposisi biaya (budget terbit) & ringkasan biaya per proyek. */
@Injectable()
export class ProjectAnalyticsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async costComposition(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap(analyticsCacheKey('analytics:cost-composition', filter), 60, async () => {
      const groups = await this.prisma.budgetItem.groupBy({
        by: ['costType'],
        where: { status: 'PUBLISHED', ...(filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {}) },
        _sum: { amount: true },
      });
      const items = groups.map((g) => ({ costType: g.costType, amount: Number(g._sum?.amount ?? 0) }));
      const total = items.reduce((s, i) => s + i.amount, 0);
      return { items, total, generatedAt: new Date().toISOString() };
    });
  }

  async projectCostSummary(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap('analytics:project-cost-summary', 60, async () => {
      const projectWhere = filter.legalEntityId ? { legalEntityId: filter.legalEntityId } : {};
      const projects = await this.prisma.project.findMany({ where: projectWhere, select: { id: true, code: true, name: true, contractValue: true } });
      const [budgetAgg, vendorInvoiceAgg, clientInvoiceAgg] = await Promise.all([
        this.prisma.budgetItem.groupBy({ by: ['projectId'], _sum: { amount: true } }),
        this.prisma.vendorInvoice.groupBy({ by: ['projectId'], where: { status: 'POSTED' }, _sum: { totalAmount: true } }),
        this.prisma.clientInvoice.groupBy({ by: ['projectId'], where: { status: 'POSTED' }, _sum: { totalAmount: true } }),
      ]);
      const budgetMap = new Map(budgetAgg.map((r) => [r.projectId, Number(r._sum?.amount ?? 0)]));
      const costMap = new Map(vendorInvoiceAgg.map((r) => [r.projectId, Number(r._sum?.totalAmount ?? 0)]));
      const revenueMap = new Map(clientInvoiceAgg.map((r) => [r.projectId, Number(r._sum?.totalAmount ?? 0)]));

      const items = projects.map((p) => {
        const budget = budgetMap.get(p.id) ?? 0;
        const cost = costMap.get(p.id) ?? 0;
        const revenue = revenueMap.get(p.id) ?? 0;
        const contract = p.contractValue != null ? Number(p.contractValue) : 0;
        return {
          projectCode: p.code,
          projectName: p.name,
          contractValue: Math.round(contract * 100) / 100,
          budget: Math.round(budget * 100) / 100,
          cost: Math.round(cost * 100) / 100,
          revenue: Math.round(revenue * 100) / 100,
          margin: Math.round((revenue - cost) * 100) / 100,
          budgetUsagePct: budget > 0 ? Math.round((cost / budget) * 1000) / 10 : 0,
        };
      });

      return { items, generatedAt: new Date().toISOString() };
    });
  }
}
