import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import type { AnalyticsFilterParams } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { ANALYTICS_CACHE_KEYS, analyticsCacheKey } from '@/shared/cache/analytics-cache';
import { resolveDateRange } from '@/shared/utils/date-range';
import { toCsvLines } from '@/shared/export/csv';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async executive(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap(analyticsCacheKey(ANALYTICS_CACHE_KEYS.executive, filter), 30, async () => {
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
        generatedAt: new Date().toISOString(),
      };
    });
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

  async cashFlow(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap(analyticsCacheKey(ANALYTICS_CACHE_KEYS.cashFlow, filter), 60, async () => {
    const { from, to } = resolveDateRange(filter.from, filter.to);
    const dateWhere = from || to ? { gte: from, lte: to } : undefined;
    const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};
    const [collections, payments] = await this.prisma.$transaction([
      this.prisma.collection.findMany({ where: { status: 'POSTED', ...projectWhere, ...(dateWhere ? { collectedAt: dateWhere } : {}) }, select: { totalAmount: true, collectedAt: true } }),
      this.prisma.payment.findMany({ where: { status: 'PAID', ...projectWhere, ...(dateWhere ? { paymentDate: dateWhere } : {}) }, select: { totalAmount: true, paymentDate: true } }),
    ]);

    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const byMonth = new Map<string, { cashIn: number; cashOut: number }>();
    for (const c of collections) {
      const k = monthKey(new Date(c.collectedAt));
      const cur = byMonth.get(k) ?? { cashIn: 0, cashOut: 0 };
      cur.cashIn += Number(c.totalAmount);
      byMonth.set(k, cur);
    }
    for (const p of payments) {
      const k = monthKey(new Date(p.paymentDate));
      const cur = byMonth.get(k) ?? { cashIn: 0, cashOut: 0 };
      cur.cashOut += Number(p.totalAmount);
      byMonth.set(k, cur);
    }

    const series = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v, net: Math.round((v.cashIn - v.cashOut) * 100) / 100 }));
    const totalIn = series.reduce((s, r) => s + r.cashIn, 0);
    const totalOut = series.reduce((s, r) => s + r.cashOut, 0);

    return { series, totalCashIn: totalIn, totalCashOut: totalOut, netCash: Math.round((totalIn - totalOut) * 100) / 100, generatedAt: new Date().toISOString() };
    });
  }

  async aging(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap(analyticsCacheKey(ANALYTICS_CACHE_KEYS.aging, filter), 60, async () => {
    const today = new Date();
    const bucket = (d: Date): string => {
      const days = Math.floor((today.getTime() - d.getTime()) / 86400000);
      if (days <= 0) return 'CURRENT';
      if (days <= 30) return '1-30';
      if (days <= 60) return '31-60';
      if (days <= 90) return '61-90';
      return '90+';
    };
    const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};

    const clientInvoices = await this.prisma.clientInvoice.findMany({
      where: { status: 'POSTED', ...projectWhere },
      include: { collections: { select: { amount: true } } },
    });
    const arBuckets = new Map<string, number>();
    for (const inv of clientInvoices) {
      const paid = inv.collections.reduce((s, c) => s + Number(c.amount), 0);
      const remaining = Math.round((Number(inv.totalAmount) - paid) * 100) / 100;
      if (remaining > 0) {
        const b = bucket(new Date(inv.invoiceDate));
        arBuckets.set(b, (arBuckets.get(b) ?? 0) + remaining);
      }
    }

    const vendorInvoices = await this.prisma.vendorInvoice.findMany({
      where: { status: 'POSTED', ...projectWhere },
      include: { payments: { select: { amount: true } } },
    });
    const apBuckets = new Map<string, number>();
    for (const inv of vendorInvoices) {
      const paid = (inv.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const remaining = Math.round((Number(inv.totalAmount) - paid) * 100) / 100;
      if (remaining > 0) {
        const b = bucket(new Date(inv.createdAt));
        apBuckets.set(b, (apBuckets.get(b) ?? 0) + remaining);
      }
    }

    const order = ['CURRENT', '1-30', '31-60', '61-90', '90+'];
    return {
      ar: order.map((b) => ({ bucket: b, amount: Math.round((arBuckets.get(b) ?? 0) * 100) / 100 })),
      ap: order.map((b) => ({ bucket: b, amount: Math.round((apBuckets.get(b) ?? 0) * 100) / 100 })),
      generatedAt: new Date().toISOString(),
    };
    });
  }

  async projectCostSummary() {
    return this.cache.wrap(ANALYTICS_CACHE_KEYS.projectCostSummary, 60, async () => {
    const projects = await this.prisma.project.findMany({ select: { id: true, code: true, name: true, contractValue: true } });
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

  /** Export Aging AP/AR sebagai CSV streaming. Menggunakan hasil cached (TTL pendek) agar konsisten & hemat. */
  async exportAgingCsv(): Promise<Readable> {
    const data = await this.aging();
    async function* rows(): AsyncGenerator<string[]> {
      yield ['section', 'bucket', 'amount'];
      for (const r of data.ar) yield ['AR', r.bucket, String(r.amount)];
      for (const r of data.ap) yield ['AP', r.bucket, String(r.amount)];
    }
    return Readable.from(toCsvLines(rows()));
  }

  /** Export Cash Flow (series bulanan) sebagai CSV streaming. */
  async exportCashFlowCsv(): Promise<Readable> {
    const data = await this.cashFlow();
    async function* rows(): AsyncGenerator<string[]> {
      yield ['month', 'cashIn', 'cashOut', 'net'];
      for (const r of data.series) yield [r.month, String(r.cashIn), String(r.cashOut), String(r.net)];
    }
    return Readable.from(toCsvLines(rows()));
  }

  /** Export Project Cost Summary sebagai CSV streaming. */
  async exportProjectCostSummaryCsv(): Promise<Readable> {
    const data = await this.projectCostSummary();
    async function* rows(): AsyncGenerator<string[]> {
      yield ['projectCode', 'projectName', 'contractValue', 'budget', 'cost', 'revenue', 'margin', 'budgetUsagePct'];
      for (const r of data.items) {
        yield [
          r.projectCode, r.projectName,
          String(r.contractValue), String(r.budget), String(r.cost), String(r.revenue),
          String(r.margin), String(r.budgetUsagePct),
        ];
      }
    }
    return Readable.from(toCsvLines(rows()));
  }
}
