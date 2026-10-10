import { Inject, Injectable } from '@nestjs/common';
import type { AnalyticsFilterParams, ExecutiveDashboard } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { ANALYTICS_CACHE_KEYS, analyticsCacheKey } from '@/shared/cache/analytics-cache';
import { resolveDateRange } from '@/shared/utils/date-range';
import { computeDelta, monthlySeries } from './shared/analytics-metrics';
import { previousPeriodBounds } from './shared/analytics-date';

/**
 * Analitik executive & operasional: dashboard eksekutif (dengan perbandingan
 * periode), sinyal operasional, dan deteksi anomali. Read-only + cache.
 */
@Injectable()
export class ExecutiveAnalyticsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async executive(
    filter: AnalyticsFilterParams = {},
    compare?: 'previous',
  ): Promise<ExecutiveDashboard> {
    const result = (await this.cache.wrap(analyticsCacheKey(ANALYTICS_CACHE_KEYS.executive, filter), 30, async () => {
      const { from, to } = resolveDateRange(filter.from, filter.to);
      const projectWhere = filter.legalEntityId ? { legalEntityId: filter.legalEntityId } : {};
      const dateWhere = from || to ? { gte: from, lte: to } : undefined;

      const [projects, budgetAgg, vendorInvoiceAgg, paymentAgg, collectionAgg, clientInvoiceAgg] = await this.prisma.$transaction([
        this.prisma.project.findMany({ where: projectWhere, select: { id: true, code: true, name: true, status: true, contractValue: true, advanceAmount: true } }),
        this.prisma.budgetItem.aggregate({ _sum: { amount: true } }),
        this.prisma.vendorInvoice.aggregate({ where: { status: 'POSTED', ...(filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {}), ...(dateWhere ? { invoiceDate: dateWhere } : {}) }, _sum: { totalAmount: true } }),
        this.prisma.payment.aggregate({ where: { status: 'PAID', ...(filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {}), ...(dateWhere ? { paymentDate: dateWhere } : {}) }, _sum: { totalAmount: true } }),
        this.prisma.collection.aggregate({ where: { status: 'POSTED', ...(filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {}), ...(dateWhere ? { collectedAt: dateWhere } : {}) }, _sum: { totalAmount: true } }),
        this.prisma.clientInvoice.aggregate({ where: { status: 'POSTED', ...(filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {}), ...(dateWhere ? { invoiceDate: dateWhere } : {}) }, _sum: { totalAmount: true } }),
      ]);

      const statusGroups = await this.prisma.project.groupBy({ by: ['status'], where: projectWhere, _count: { _all: true } });
      const projectStatusCount = Object.fromEntries(statusGroups.map((r) => [r.status, r._count._all]));
      const totalContractValue = projects.reduce((s, p) => s + (p.contractValue != null ? Number(p.contractValue) : 0), 0);

      const [openClaims, openNcrs, openIncidents, overduePm, openPunch] = await this.prisma.$transaction([
        this.prisma.progressClaim.count({ where: { status: 'DRAFT', ...(filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {}) } }),
        this.prisma.ncr.count({ where: { status: { not: 'CLOSED' }, ...(filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {}) } }),
        this.prisma.hseIncident.count({ where: { status: { not: 'RESOLVED' }, ...(filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {}) } }),
        this.prisma.equipmentPm.count({ where: { status: 'SCHEDULED', dueDate: { lt: new Date() } } }),
        this.prisma.punchListItem.count({ where: { status: 'OPEN', ...(filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {}) } }),
      ]);

      // Seri tren 6 bulan — semua dari timestamp nyata (aliran per bulan).
      const trendSince = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1));
      const trendProjectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};
      const [collections, payments, newProjects, newBudget, newNcrs, newIncidents] = await this.prisma.$transaction([
        this.prisma.collection.findMany({ where: { status: 'POSTED', ...trendProjectWhere, collectedAt: { gte: trendSince } }, select: { totalAmount: true, collectedAt: true } }),
        this.prisma.payment.findMany({ where: { status: 'PAID', ...trendProjectWhere, paymentDate: { gte: trendSince } }, select: { totalAmount: true, paymentDate: true } }),
        this.prisma.project.findMany({ where: { ...projectWhere, createdAt: { gte: trendSince } }, select: { createdAt: true } }),
        this.prisma.budgetItem.findMany({ where: { ...(filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {}), createdAt: { gte: trendSince } }, select: { amount: true, createdAt: true } }),
        this.prisma.ncr.findMany({ where: { ...trendProjectWhere, createdAt: { gte: trendSince } }, select: { createdAt: true } }),
        this.prisma.hseIncident.findMany({ where: { ...trendProjectWhere, createdAt: { gte: trendSince } }, select: { createdAt: true } }),
      ]);

      return {
        projects: {
          total: projects.length,
          byStatus: projectStatusCount,
          totalContractValue,
          totalAdvance: projects.reduce((s, p) => s + (p.advanceAmount != null ? Number(p.advanceAmount) : 0), 0),
        },
        finance: {
          totalBudget: Number(budgetAgg._sum.amount ?? 0),
          postedVendorInvoice: Number(vendorInvoiceAgg._sum.totalAmount ?? 0),
          postedClientInvoice: Number(clientInvoiceAgg._sum.totalAmount ?? 0),
          cashIn: Number(collectionAgg._sum?.totalAmount ?? 0),
          cashOut: Number(paymentAgg._sum?.totalAmount ?? 0),
        },
        operational: {
          openClaims: openClaims,
          openNcrs: openNcrs,
          openIncidents: openIncidents,
          overduePm: overduePm,
          openPunchItems: openPunch,
        },
        trend: {
          cashIn: monthlySeries(collections.map((c) => ({ at: new Date(c.collectedAt), value: Number(c.totalAmount) }))),
          cashOut: monthlySeries(payments.map((p) => ({ at: new Date(p.paymentDate), value: Number(p.totalAmount) }))),
          newProjects: monthlySeries(newProjects.map((p) => ({ at: new Date(p.createdAt) }))),
          newBudget: monthlySeries(newBudget.map((b) => ({ at: new Date(b.createdAt), value: Number(b.amount) }))),
          newNcrs: monthlySeries(newNcrs.map((n) => ({ at: new Date(n.createdAt) }))),
          newIncidents: monthlySeries(newIncidents.map((i) => ({ at: new Date(i.createdAt) }))),
        },
        generatedAt: new Date().toISOString(),
      };
    })) as ExecutiveDashboard;

    if (compare !== 'previous') return result;

    // Periode pembanding: geser mundur sepanjang rentang; tanpa rentang → bulan sebelumnya.
    const { from: prevFrom, to: prevTo } = previousPeriodBounds(filter);
    const prevFilter = {
      legalEntityId: filter.legalEntityId,
      from: prevFrom.toISOString().slice(0, 10),
      to: prevTo.toISOString().slice(0, 10),
    };
    const previous = await this.executive(prevFilter);

    // Hanya metrik period-scoped yang dibandingkan. Snapshot (mis. overduePm,
    // openPunchItems) sengaja dilewati — membandingkannya antar periode menyesatkan.
    const delta = {
      'finance.totalBudget': computeDelta(result.finance.totalBudget, previous.finance.totalBudget),
      'finance.cashIn': computeDelta(result.finance.cashIn, previous.finance.cashIn),
      'finance.cashOut': computeDelta(result.finance.cashOut, previous.finance.cashOut),
      'finance.postedVendorInvoice': computeDelta(result.finance.postedVendorInvoice, previous.finance.postedVendorInvoice),
      'finance.postedClientInvoice': computeDelta(result.finance.postedClientInvoice, previous.finance.postedClientInvoice),
      'operational.openNcrs': computeDelta(result.operational.openNcrs, previous.operational.openNcrs),
      'projects.total': computeDelta(result.projects.total, previous.projects.total),
      'projects.totalContractValue': computeDelta(result.projects.totalContractValue, previous.projects.totalContractValue),
    };

    return { ...result, delta };
  }

  async signals(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap(analyticsCacheKey('analytics:signals', filter), 30, async () => {
      const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};
      const ageDays = (rows: { createdAt: Date }[]) =>
        rows.length === 0 ? 0 : Math.floor((Date.now() - Math.min(...rows.map((r) => r.createdAt.getTime()))) / 86400000);

      const [ncrs, incidents, punch, claims, pms, approvals] = await this.prisma.$transaction([
        this.prisma.ncr.findMany({ where: { status: { not: 'CLOSED' }, ...projectWhere }, select: { createdAt: true } }),
        this.prisma.hseIncident.findMany({ where: { status: { not: 'RESOLVED' }, ...projectWhere }, select: { createdAt: true } }),
        this.prisma.punchListItem.findMany({ where: { status: 'OPEN', ...projectWhere }, select: { createdAt: true } }),
        this.prisma.progressClaim.findMany({ where: { status: 'DRAFT', ...projectWhere }, select: { createdAt: true } }),
        this.prisma.equipmentPm.findMany({ where: { status: 'SCHEDULED', dueDate: { lt: new Date() } }, select: { createdAt: true } }),
        this.prisma.approvalTask.findMany({ where: { status: 'PENDING' }, select: { createdAt: true } }),
      ]);

      const build = (
        key: string,
        severity: 'HIGH' | 'MEDIUM' | 'LOW',
        rows: { createdAt: Date }[],
        label: string,
        to: string,
      ) => (rows.length === 0 ? null : { key, severity, count: rows.length, oldestAgeDays: ageDays(rows), label, to });

      const signals = [
        build('ncrs', 'HIGH', ncrs, 'NCRs', '/quality?tab=ncrs&status=OPEN'),
        build('incidents', 'HIGH', incidents, 'Incidents', '/hse?tab=incidents&status=OPEN'),
        build('pm', 'MEDIUM', pms, 'PM overdue', '/hcm/equipment'),
        build('claims', 'LOW', claims, 'Claims DRAFT', '/finance/progress-claims?status=DRAFT'),
        build('approvals', 'LOW', approvals, 'Approvals', '/approvals'),
        build('punch', 'LOW', punch, 'Punch items', '/quality?tab=punch&status=OPEN'),
      ].filter((s): s is NonNullable<typeof s> => s != null);

      const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
      signals.sort((a, b) => rank[a.severity] - rank[b.severity] || b.oldestAgeDays - a.oldestAgeDays || b.count - a.count);

      return { signals, generatedAt: new Date().toISOString() };
    });
  }

  async anomalies() {
    return this.cache.wrap(ANALYTICS_CACHE_KEYS.anomalies, 60, async () => {
      const anomalies: Array<{ type: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; projectCode?: string; message: string }> = [];

      const budgetAgg = await this.prisma.budgetItem.groupBy({ by: ['projectId'], _sum: { amount: true } });
      const budgetByProject = new Map(budgetAgg.map((r) => [r.projectId, Number(r._sum.amount ?? 0)]));
      const projects = await this.prisma.project.findMany({ select: { id: true, code: true, contractValue: true } });
      for (const p of projects) {
        const budget = budgetByProject.get(p.id) ?? 0;
        const contract = p.contractValue != null ? Number(p.contractValue) : 0;
        if (budget > 0 && contract > 0 && budget / contract > 0.9) {
          anomalies.push({
            type: 'BUDGET_OVERRUN',
            severity: budget / contract > 1 ? 'HIGH' : 'MEDIUM',
            projectCode: p.code,
            message: `Budget ${Math.round((budget / contract) * 100)}% of contract (${budget.toLocaleString('id-ID')} / ${contract.toLocaleString('id-ID')})`,
          });
        }
      }

      const overduePmCount = await this.prisma.equipmentPm.count({ where: { status: 'SCHEDULED', dueDate: { lt: new Date() } } });
      if (overduePmCount > 0) {
        anomalies.push({ type: 'PM_OVERDUE', severity: 'MEDIUM', message: `${overduePmCount} PM schedule(s) past due` });
      }

      const criticalNcrCount = await this.prisma.ncr.count({ where: { severity: 'CRITICAL', status: { not: 'CLOSED' } } });
      if (criticalNcrCount > 0) {
        anomalies.push({ type: 'NCR_CRITICAL_OPEN', severity: 'HIGH', message: `${criticalNcrCount} CRITICAL NCR(s) not yet closed` });
      }

      const openHighIncidents = await this.prisma.hseIncident.count({ where: { severity: { in: ['HIGH', 'CRITICAL'] }, status: { not: 'RESOLVED' } } });
      if (openHighIncidents > 0) {
        anomalies.push({ type: 'INCIDENT_HIGH_OPEN', severity: 'HIGH', message: `${openHighIncidents} HIGH/CRITICAL incident(s) not yet resolved` });
      }

      const overallocated = await this.prisma.projectAssignment.groupBy({
        by: ['employeeId'],
        where: { status: 'ACTIVE' },
        _sum: { allocationPercent: true },
        having: { allocationPercent: { _sum: { gt: 100 } } },
      });
      if (overallocated.length > 0) {
        const employeeIds = overallocated.map((r) => r.employeeId);
        const emps = await this.prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { name: true } });
        anomalies.push({ type: 'ALLOCATION_OVER_100', severity: 'MEDIUM', message: `${emps.length} employee(s) with active allocation >100%: ${emps.map((e) => e.name).join(', ')}` });
      }

      const draftClaims = await this.prisma.progressClaim.count({ where: { status: 'DRAFT' } });
      if (draftClaims >= 3) {
        anomalies.push({ type: 'CLAIMS_DRAFT_BACKLOG', severity: 'LOW', message: `${draftClaims} claim(s) still DRAFT - certification needed` });
      }

      return { anomalies, total: anomalies.length, generatedAt: new Date().toISOString() };
    });
  }
}
