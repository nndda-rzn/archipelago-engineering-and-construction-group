import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import type { AnalyticsFilterParams, ExecutiveDashboard } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { ANALYTICS_CACHE_KEYS, analyticsCacheKey } from '@/shared/cache/analytics-cache';
import { resolveDateRange } from '@/shared/utils/date-range';
import { monthKeyUtc } from '@/shared/utils/month-key';
import { lastNMonthsUtc, monthSpanUtc } from './shared/analytics-date';
import { computeDelta as computeDeltaPure, monthlySeries as monthlySeriesPure } from './shared/analytics-metrics';
import { toCsvLines } from '@/shared/export/csv';

/** Baris invoice di balik angka sebuah bucket aging. */
export interface AgingDetail {
  invoiceNumber: string;
  party: string;
  projectCode: string | null;
  date: string;
  ageDays: number;
  outstanding: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  /** Delta metrik periode ini vs periode sebelumnya. `pctChange` null bila pembanding 0. */
  computeDelta(
    current: number,
    previous: number,
  ): { current: number; previous: number; pctChange: number | null; direction: 'up' | 'down' | 'flat' } {
    return computeDeltaPure(current, previous);
  }

  /**
   * Kelompokkan baris bertimestamp menjadi seri bulanan (6 bulan terakhir, termasuk
   * bulan berjalan). Bulan tanpa baris diisi 0 supaya grafik tidak "melebar" palsu.
   * `value` boleh jumlah baris (default 1 per baris) atau nilai numerik yang disediakan.
   *
   * PENTING: ini mengukur **aliran** (berapa banyak dibuat/bulan), bukan **stok**
   * (berapa banyak terbuka saat itu). Label UI harus mencerminkan itu.
   */
  monthlySeries(rows: { at: Date; value?: number }[], now: Date = new Date(), months = 6): { month: string; value: number }[] {
    return monthlySeriesPure(rows, now, months);
  }

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
          cashIn: this.monthlySeries(collections.map((c) => ({ at: new Date(c.collectedAt), value: Number(c.totalAmount) }))),
          cashOut: this.monthlySeries(payments.map((p) => ({ at: new Date(p.paymentDate), value: Number(p.totalAmount) }))),
          newProjects: this.monthlySeries(newProjects.map((p) => ({ at: new Date(p.createdAt) }))),
          newBudget: this.monthlySeries(newBudget.map((b) => ({ at: new Date(b.createdAt), value: Number(b.amount) }))),
          newNcrs: this.monthlySeries(newNcrs.map((n) => ({ at: new Date(n.createdAt) }))),
          newIncidents: this.monthlySeries(newIncidents.map((i) => ({ at: new Date(i.createdAt) }))),
        },
        generatedAt: new Date().toISOString(),
      };
    })) as ExecutiveDashboard;

    if (compare !== 'previous') return result;

    // Periode pembanding: geser mundur sepanjang rentang; tanpa rentang → bulan sebelumnya.
    const { from, to } = resolveDateRange(filter.from, filter.to);
    let prevFrom: Date;
    let prevTo: Date;
    if (from && to) {
      const spanMs = to.getTime() - from.getTime();
      prevTo = new Date(from.getTime() - 1);
      prevFrom = new Date(prevTo.getTime() - spanMs);
    } else {
      const base = to ?? new Date();
      prevTo = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 0));
      prevFrom = new Date(Date.UTC(prevTo.getUTCFullYear(), prevTo.getUTCMonth(), 1));
    }
    const prevFilter = {
      legalEntityId: filter.legalEntityId,
      from: prevFrom.toISOString().slice(0, 10),
      to: prevTo.toISOString().slice(0, 10),
    };
    const previous = await this.executive(prevFilter);

    // Hanya metrik period-scoped yang dibandingkan. Snapshot (mis. overduePm,
    // openPunchItems) sengaja dilewati — membandingkannya antar periode menyesatkan.
    const delta = {
      'finance.totalBudget': this.computeDelta(result.finance.totalBudget, previous.finance.totalBudget),
      'finance.cashIn': this.computeDelta(result.finance.cashIn, previous.finance.cashIn),
      'finance.cashOut': this.computeDelta(result.finance.cashOut, previous.finance.cashOut),
      'finance.postedVendorInvoice': this.computeDelta(result.finance.postedVendorInvoice, previous.finance.postedVendorInvoice),
      'finance.postedClientInvoice': this.computeDelta(result.finance.postedClientInvoice, previous.finance.postedClientInvoice),
      'operational.openNcrs': this.computeDelta(result.operational.openNcrs, previous.operational.openNcrs),
      'projects.total': this.computeDelta(result.projects.total, previous.projects.total),
      'projects.totalContractValue': this.computeDelta(result.projects.totalContractValue, previous.projects.totalContractValue),
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

    const byMonth = new Map<string, { cashIn: number; cashOut: number }>();
    for (const c of collections) {
      const k = monthKeyUtc(new Date(c.collectedAt));
      const cur = byMonth.get(k) ?? { cashIn: 0, cashOut: 0 };
      cur.cashIn += Number(c.totalAmount);
      byMonth.set(k, cur);
    }
    for (const p of payments) {
      const k = monthKeyUtc(new Date(p.paymentDate));
      const cur = byMonth.get(k) ?? { cashIn: 0, cashOut: 0 };
      cur.cashOut += Number(p.totalAmount);
      byMonth.set(k, cur);
    }

    // Rentang bulan: hormati filter bila ada, selain itu 6 bulan terakhir.
    // Bulan tanpa transaksi diisi 0 supaya celah tidak "menghilang" dari grafik.
    const months = from || to ? monthSpanUtc(from ?? to!, to ?? from!) : lastNMonthsUtc(6);
    const series = months.map((month) => {
      const v = byMonth.get(month) ?? { cashIn: 0, cashOut: 0 };
      return { month, cashIn: v.cashIn, cashOut: v.cashOut, net: Math.round((v.cashIn - v.cashOut) * 100) / 100 };
    });
    const totalIn = series.reduce((s, r) => s + r.cashIn, 0);
    const totalOut = series.reduce((s, r) => s + r.cashOut, 0);

    return { series, totalCashIn: totalIn, totalCashOut: totalOut, netCash: Math.round((totalIn - totalOut) * 100) / 100, generatedAt: new Date().toISOString() };
    });
  }

  async aging(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap(analyticsCacheKey(ANALYTICS_CACHE_KEYS.aging, filter), 60, async () => {
    const asOf = new Date();
    const { from, to } = resolveDateRange(filter.from, filter.to);
    // Basis umur SAMA untuk AR & AP (`invoiceDate`) — sebelumnya AP memakai
    // createdAt sehingga dua sisi "umur" punya arti berbeda.
    const dateWhere = from || to ? { gte: from, lte: to } : undefined;
    const bucketOf = (d: Date): string => {
      const days = Math.floor((asOf.getTime() - d.getTime()) / 86400000);
      if (days <= 0) return 'CURRENT';
      if (days <= 30) return '1-30';
      if (days <= 60) return '31-60';
      if (days <= 90) return '61-90';
      return '90+';
    };
    const ageOf = (d: Date) => Math.max(0, Math.floor((asOf.getTime() - d.getTime()) / 86400000));
    const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};

    const clientInvoices = await this.prisma.clientInvoice.findMany({
      where: { status: 'POSTED', ...projectWhere, ...(dateWhere ? { invoiceDate: dateWhere } : {}) },
      include: { collections: { select: { amount: true } }, project: { select: { code: true } } },
    });
    const arBuckets = new Map<string, { amount: number; detail: AgingDetail[] }>();
    for (const inv of clientInvoices) {
      const paid = inv.collections.reduce((s, c) => s + Number(c.amount), 0);
      const remaining = Math.round((Number(inv.totalAmount) - paid) * 100) / 100;
      if (remaining <= 0) continue;
      const date = new Date(inv.invoiceDate);
      const b = bucketOf(date);
      const cur = arBuckets.get(b) ?? { amount: 0, detail: [] };
      cur.amount += remaining;
      cur.detail.push({ invoiceNumber: inv.invoiceNumber, party: inv.client, projectCode: inv.project?.code ?? null, date: date.toISOString(), ageDays: ageOf(date), outstanding: remaining });
      arBuckets.set(b, cur);
    }

    const vendorInvoices = await this.prisma.vendorInvoice.findMany({
      where: { status: 'POSTED', ...projectWhere, ...(dateWhere ? { invoiceDate: dateWhere } : {}) },
      include: { payments: { select: { amount: true } }, project: { select: { code: true } } },
    });
    const apBuckets = new Map<string, { amount: number; detail: AgingDetail[] }>();
    for (const inv of vendorInvoices) {
      const paid = (inv.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const remaining = Math.round((Number(inv.totalAmount) - paid) * 100) / 100;
      if (remaining <= 0) continue;
      const date = new Date(inv.invoiceDate);
      const b = bucketOf(date);
      const cur = apBuckets.get(b) ?? { amount: 0, detail: [] };
      cur.amount += remaining;
      cur.detail.push({ invoiceNumber: inv.invoiceNumber, party: inv.vendor, projectCode: inv.project?.code ?? null, date: date.toISOString(), ageDays: ageOf(date), outstanding: remaining });
      apBuckets.set(b, cur);
    }

    const order = ['CURRENT', '1-30', '31-60', '61-90', '90+'];
    const toBucket = (map: Map<string, { amount: number; detail: AgingDetail[] }>) => (b: string) => {
      const v = map.get(b) ?? { amount: 0, detail: [] };
      return { bucket: b, amount: Math.round(v.amount * 100) / 100, detail: v.detail.sort((x, y) => y.outstanding - x.outstanding) };
    };
    return {
      ar: order.map(toBucket(arBuckets)),
      ap: order.map(toBucket(apBuckets)),
      asOf: asOf.toISOString(),
      basisDate: 'invoiceDate',
      generatedAt: new Date().toISOString(),
    };
    });
  }

  /** Konsentrasi piutang per klien — siapa yang menahan kas. */
  async arConcentration(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap('analytics:ar-concentration', 60, async () => {
      const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};
      const invoices = await this.prisma.clientInvoice.findMany({
        where: { status: 'POSTED', ...projectWhere },
        include: { collections: { select: { amount: true } } },
      });
      const byClient = new Map<string, number>();
      for (const inv of invoices) {
        const paid = inv.collections.reduce((s, c) => s + Number(c.amount), 0);
        const remaining = Math.round((Number(inv.totalAmount) - paid) * 100) / 100;
        if (remaining <= 0) continue;
        byClient.set(inv.client, (byClient.get(inv.client) ?? 0) + remaining);
      }
      const total = [...byClient.values()].reduce((s, v) => s + v, 0);
      const items = [...byClient.entries()]
        .map(([client, amount]) => ({ client, amount: Math.round(amount * 100) / 100, pct: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0 }))
        .sort((a, b) => b.amount - a.amount);
      return { items, total: Math.round(total * 100) / 100, generatedAt: new Date().toISOString() };
    });
  }

  /** Rencana kas (`CashForecast`) vs realisasi per periode. */
  async forecastVsActual(filter: AnalyticsFilterParams = {}) {
    return this.cache.wrap('analytics:forecast-vs-actual', 60, async () => {
      const entityWhere = filter.legalEntityId ? { legalEntityId: filter.legalEntityId } : {};
      const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};
      const [forecasts, collections, payments] = await this.prisma.$transaction([
        this.prisma.cashForecast.findMany({ where: entityWhere, orderBy: { period: 'asc' }, select: { period: true, netForecast: true } }),
        this.prisma.collection.findMany({ where: { status: 'POSTED', ...projectWhere }, select: { totalAmount: true, collectedAt: true } }),
        this.prisma.payment.findMany({ where: { status: 'PAID', ...projectWhere }, select: { totalAmount: true, paymentDate: true } }),
      ]);
      const actualByMonth = new Map<string, number>();
      for (const c of collections) {
        const k = monthKeyUtc(new Date(c.collectedAt));
        actualByMonth.set(k, (actualByMonth.get(k) ?? 0) + Number(c.totalAmount));
      }
      for (const p of payments) {
        const k = monthKeyUtc(new Date(p.paymentDate));
        actualByMonth.set(k, (actualByMonth.get(k) ?? 0) - Number(p.totalAmount));
      }
      const periods = forecasts.map((f) => ({
        period: f.period,
        forecastNet: Number(f.netForecast),
        actualNet: Math.round((actualByMonth.get(f.period) ?? 0) * 100) / 100,
      }));
      return { periods, generatedAt: new Date().toISOString() };
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

  /** Export Aging AP/AR sebagai CSV streaming. Mengikuti filter yang aktif (entity + rentang tanggal). */
  async exportAgingCsv(filter: AnalyticsFilterParams = {}): Promise<Readable> {
    const data = await this.aging(filter);
    async function* rows(): AsyncGenerator<string[]> {
      yield ['section', 'bucket', 'amount', 'invoice', 'party', 'project', 'date', 'ageDays', 'outstanding'];
      for (const r of data.ar) {
        if (r.detail.length === 0) yield ['AR', r.bucket, String(r.amount), '', '', '', '', '', ''];
        for (const d of r.detail) yield ['AR', r.bucket, String(r.amount), d.invoiceNumber, d.party, d.projectCode ?? '', d.date, String(d.ageDays), String(d.outstanding)];
      }
      for (const r of data.ap) {
        if (r.detail.length === 0) yield ['AP', r.bucket, String(r.amount), '', '', '', '', '', ''];
        for (const d of r.detail) yield ['AP', r.bucket, String(r.amount), d.invoiceNumber, d.party, d.projectCode ?? '', d.date, String(d.ageDays), String(d.outstanding)];
      }
    }
    return Readable.from(toCsvLines(rows()));
  }

  /** Export Cash Flow (series bulanan) sebagai CSV streaming. Mengikuti filter. */
  async exportCashFlowCsv(filter: AnalyticsFilterParams = {}): Promise<Readable> {
    const data = await this.cashFlow(filter);
    async function* rows(): AsyncGenerator<string[]> {
      yield ['month', 'cashIn', 'cashOut', 'net'];
      for (const r of data.series) yield [r.month, String(r.cashIn), String(r.cashOut), String(r.net)];
    }
    return Readable.from(toCsvLines(rows()));
  }

  /** Export Project Cost Summary sebagai CSV streaming. Mengikuti filter. */
  async exportProjectCostSummaryCsv(filter: AnalyticsFilterParams = {}): Promise<Readable> {
    const data = await this.projectCostSummary(filter);
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
