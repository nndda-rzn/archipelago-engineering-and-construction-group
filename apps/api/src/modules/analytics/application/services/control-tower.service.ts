import { Inject, Injectable } from '@nestjs/common';
import type {
  AnalyticsFilterParams,
  ControlTower,
  ControlTowerException,
  ControlTowerKpi,
  KpiDirection,
} from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { analyticsCacheKey } from '@/shared/cache/analytics-cache';
import { resolveDateRange } from '@/shared/utils/date-range';
import { ExecutiveAnalyticsService } from './executive-analytics.service';
import { FinancialAnalyticsService } from './financial-analytics.service';
import { PortfolioEvmCalculator } from '@/shared/project/portfolio-evm.calculator';

/** Batas SLA default (hari) bila sebuah exception tidak punya tenggat eksplisit. */
const DEFAULT_SLA_DAYS = 7;

/**
 * Hitung pencapaian terhadap target sesuai arah maknanya.
 *
 * - `MIN` (target adalah **lantai**, mis. cash ≥ 15B): attainment = value/target.
 *   120% berarti 20% di atas lantai. `meetsTarget` = value ≥ target.
 * - `MAX` (target adalah **plafon**, mis. DSO ≤ 45 hari): attainment = target/value.
 *   75% berarti masih di bawah plafon; >100% berarti sudah melampaui plafon.
 *   `meetsTarget` = value ≤ target.
 * - `EXACT`: kedekatan ke target, 100% = tepat.
 *
 * Mengembalikan `null` bila target ≤ 0 atau tidak ada, supaya UI menampilkan "—"
 * alih-alih angka menyesatkan (pembagian nol).
 */
export function computeAttainment(value: number, target: number | null, direction: KpiDirection): number | null {
  if (target == null || target === 0) return null;
  if (direction === 'EXACT') return Math.round((1 - Math.abs(value - target) / Math.abs(target)) * 1000) / 10;
  // Ceiling (MAX) dengan nilai 0 berarti "sama sekali tidak ada" → sempurna.
  if (direction === 'MAX' && value <= 0) return 100;
  const ratio = direction === 'MAX' ? target / value : value / target;
  if (!Number.isFinite(ratio)) return null;
  // Batasi tampilan agar tidak meledak (mis. value 3 vs plafon 80 → 2667%).
  // 200% sudah cukup menyatakan "jauh melampaui"; angka lebih besar tidak informatif.
  return Math.round(Math.min(ratio, 2) * 1000) / 10;
}

/** Apakah nilai memenuhi target, sesuai arah. `null` bila tanpa target. */
export function meetsTarget(value: number, target: number | null, direction: KpiDirection): boolean | null {
  if (target == null) return null;
  if (direction === 'MIN') return value >= target;
  if (direction === 'MAX') return value <= target;
  return value === target;
}

/** Selisih hari (bulat) antara dua tanggal, tidak pernah negatif. */
export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

/** Umur & status overdue sebuah exception dari `createdAt` + batas SLA. */
export function slaState(createdAt: Date, dueAt: Date | null, now: Date): { ageDays: number; slaDays: number | null; overdue: boolean } {
  const ageDays = daysBetween(createdAt, now);
  if (!dueAt) return { ageDays, slaDays: null, overdue: false };
  const slaDays = Math.max(1, daysBetween(createdAt, dueAt));
  return { ageDays, slaDays, overdue: now.getTime() > dueAt.getTime() };
}

/** Urutkan exception: severity menurun, lalu overdue lebih dulu, lalu umur menurun. */
const SEVERITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
export function rankExceptions(items: ControlTowerException[]): ControlTowerException[] {
  return [...items].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      Number(b.overdue) - Number(a.overdue) ||
      b.ageDays - a.ageDays,
  );
}

/**
 * Control Tower (FR-DASH-003): satu payload komposit untuk dashboard `/`.
 *
 * Facade read-only — memakai ulang agregat executive & financial yang sudah ada,
 * lalu menambah pembacaan lintas domain (procurement, HSE, quality, HCM,
 * governance, commercial, treasury) dan pencapaian KPI terhadap `KpiTarget`.
 * Cache 45 detik; semua blok selalu terisi (array/objek kosong, bukan null).
 */
@Injectable()
export class ControlTowerService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
    @Inject(ExecutiveAnalyticsService) private readonly executive: ExecutiveAnalyticsService,
    @Inject(FinancialAnalyticsService) private readonly financial: FinancialAnalyticsService,
    @Inject(PortfolioEvmCalculator) private readonly evm: PortfolioEvmCalculator,
  ) {}

  async controlTower(filter: AnalyticsFilterParams = {}): Promise<ControlTower> {
    return this.cache.wrap(analyticsCacheKey('analytics:control-tower', filter), 45, async () => {
      const now = new Date();
      const { from, to } = resolveDateRange(filter.from, filter.to);
      const entityWhere = filter.legalEntityId ? { legalEntityId: filter.legalEntityId } : {};
      const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};
      const dateWhere = from || to ? { gte: from, lte: to } : undefined;

      // Reuse agregat yang sudah ada — jangan hitung ulang angka yang sama.
      const [exec, cashFlow, aging, portfolioItems] = await Promise.all([
        this.executive.executive(filter),
        this.financial.cashFlow(filter),
        this.financial.aging(filter),
        this.loadPortfolio(filter),
      ]);

      const [
        pendingApprovals,
        overdueNcrs,
        openIncidents,
        overdueCas,
        bgExpiring,
        treasury,
        procurement,
        hcm,
        governance,
        commercial,
        inventory,
      ] = await Promise.all([
        this.loadPendingApprovals(now),
        this.loadOverdueNcrs(now, projectWhere),
        this.loadOpenIncidents(now, projectWhere),
        this.loadOverdueCorrectiveActions(now, projectWhere),
        this.loadExpiringGuarantees(now, entityWhere),
        this.loadTreasury(entityWhere),
        this.loadProcurement(now, projectWhere),
        this.loadHcm(now, projectWhere),
        this.loadGovernance(projectWhere),
        this.loadCommercial(now, dateWhere),
        this.loadInventory(projectWhere, dateWhere),
      ]);

      const exceptions = rankExceptions([...pendingApprovals, ...overdueNcrs, ...openIncidents, ...overdueCas, ...bgExpiring]);
      const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 };
      for (const e of exceptions) bySeverity[e.severity] += 1;

      const arOverdue = aging.ar.filter((b) => b.bucket !== 'CURRENT').reduce((s, b) => s + b.amount, 0);
      const arOutstanding = aging.ar.reduce((s, b) => s + b.amount, 0);
      const totalBudget = exec.finance.totalBudget;
      const totalActual = portfolioItems.reduce((s, p) => s + p.actual, 0);
      const cashOnHand = treasury.cashOnHand;
      const netCash = cashFlow.netCash;

      const kpis = this.buildKpis({
        cashOnHand,
        netCash,
        backlog: exec.projects.totalContractValue,
        budgetRemaining: Math.round((totalBudget - totalActual) * 100) / 100,
        arOverdue,
        dso: this.computeDso(arOutstanding, exec.finance.postedClientInvoice, from, to),
        trir: hcm.trir,
        manpowerToday: hcm.manpowerToday,
        targets: await this.loadTargets(filter),
      });

      return {
        kpis,
        exceptions: { bySeverity, items: exceptions, total: exceptions.length },
        projects: portfolioItems,
        projectTotals: {
          count: portfolioItems.length,
          contractValue: portfolioItems.reduce((s, p) => s + p.contractValue, 0),
          budget: portfolioItems.reduce((s, p) => s + p.budget, 0),
          actual: portfolioItems.reduce((s, p) => s + p.actual, 0),
          variance: portfolioItems.reduce((s, p) => s + p.variance, 0),
        },
        operations: {
          procurement,
          safety: hcm.safety,
          quality: hcm.quality,
          hcm: hcm.hcm,
          inventory,
        },
        governance,
        commercial,
        treasury,
        generatedAt: now.toISOString(),
      };
    }) as Promise<ControlTower>;
  }

  // ── helper yang dipisah agar mudah diuji ──────────────────────────────────

  private async loadTargets(filter: AnalyticsFilterParams): Promise<Map<string, { target: number; direction: KpiDirection }>> {
    const now = new Date();
    const period = `FY${now.getUTCFullYear()}`;
    const rows = await this.prisma.kpiTarget.findMany({ where: { period } });
    // Prioritas resolusi target per metrik:
    // 1) entitas yang sedang difilter, 2) target grup (legalEntityId null),
    // 3) target apa pun yang ada. Tanpa ini dashboard seluruh-grup bisa kosong.
    const map = new Map<string, { target: number; direction: KpiDirection }>();
    const pick = (metric: string): { target: number; direction: KpiDirection } | undefined => {
      const exact = filter.legalEntityId ? rows.find((r) => r.metric === metric && r.legalEntityId === filter.legalEntityId) : undefined;
      const group = rows.find((r) => r.metric === metric && r.legalEntityId == null);
      const any = rows.find((r) => r.metric === metric);
      const chosen = exact ?? group ?? any;
      return chosen ? { target: Number(chosen.target), direction: chosen.direction as KpiDirection } : undefined;
    };
    for (const metric of new Set(rows.map((r) => r.metric))) {
      const v = pick(metric);
      if (v) map.set(metric, v);
    }
    return map;
  }

  private buildKpis(input: {
    cashOnHand: number;
    netCash: number;
    backlog: number;
    budgetRemaining: number;
    arOverdue: number;
    dso: number;
    trir: number;
    manpowerToday: number;
    targets: Map<string, { target: number; direction: KpiDirection }>;
  }): ControlTowerKpi[] {
    const defs: { key: string; label: string; value: number; unit: string; metric: string; defaultDirection: KpiDirection }[] = [
      { key: 'cash', label: 'Cash on hand', value: input.cashOnHand, unit: 'idr', metric: 'cash.min', defaultDirection: 'MIN' },
      { key: 'netCashFlow', label: 'Net cash flow', value: input.netCash, unit: 'idr', metric: 'cashflow.net.min', defaultDirection: 'MIN' },
      { key: 'backlog', label: 'Contract backlog', value: input.backlog, unit: 'idr', metric: 'backlog.min', defaultDirection: 'MIN' },
      { key: 'budgetVariance', label: 'Budget remaining', value: input.budgetRemaining, unit: 'idr', metric: 'budget.remaining.min', defaultDirection: 'MIN' },
      { key: 'arOverdue', label: 'AR overdue 61+', value: input.arOverdue, unit: 'idr', metric: 'ar.overdue.max', defaultDirection: 'MAX' },
      { key: 'dso', label: 'DSO', value: input.dso, unit: 'days', metric: 'dso.max', defaultDirection: 'MAX' },
      { key: 'trir', label: 'Safety · TRIR', value: input.trir, unit: 'ratio', metric: 'safety.trir.max', defaultDirection: 'MAX' },
      { key: 'manpower', label: 'Manpower today', value: input.manpowerToday, unit: 'count', metric: 'manpower.min', defaultDirection: 'MIN' },
    ];
    return defs.map((d) => {
      const t = input.targets.get(d.metric);
      const target = t?.target ?? null;
      const direction = t?.direction ?? d.defaultDirection;
      return {
        key: d.key,
        label: d.label,
        value: Math.round(d.value * 100) / 100,
        unit: d.unit,
        target,
        direction,
        attainmentPct: computeAttainment(d.value, target, direction),
        meetsTarget: meetsTarget(d.value, target, direction),
      };
    });
  }

  /**
   * DSO (Days Sales Outstanding) = piutang belum tertagih / (revenue harian).
   * Revenue harian = invoice klien terposting / jumlah hari periode (default 365).
   * Mengembalikan 0 bila revenue ≤ 0 (menghindari pembagian nol).
   */
  private computeDso(arOutstanding: number, postedClientInvoice: number, from?: Date, to?: Date): number {
    if (postedClientInvoice <= 0) return 0;
    const spanDays = from && to ? Math.max(1, daysBetween(from, to)) : 365;
    const dailyRevenue = postedClientInvoice / spanDays;
    return Math.round((arOutstanding / dailyRevenue) * 10) / 10;
  }

  private async loadPortfolio(filter: AnalyticsFilterParams) {
    const projectWhere = filter.legalEntityId ? { legalEntityId: filter.legalEntityId } : {};
    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      select: { id: true, code: true, name: true, client: true, contractValue: true },
    });
    const [budgetAgg, costAgg, revenueAgg, riskAgg, evmMap] = await Promise.all([
      this.prisma.budgetItem.groupBy({ by: ['projectId'], where: { status: 'PUBLISHED' }, _sum: { amount: true } }),
      this.prisma.vendorInvoice.groupBy({ by: ['projectId'], where: { status: 'POSTED' }, _sum: { totalAmount: true } }),
      this.prisma.clientInvoice.groupBy({ by: ['projectId'], where: { status: 'POSTED' }, _sum: { totalAmount: true } }),
      this.prisma.risk.groupBy({ by: ['projectId'], where: { status: 'OPEN' }, _max: { score: true } }),
      this.evm.computeBatch(projects.map((p) => p.id)),
    ]);
    const budgetMap = new Map(budgetAgg.map((r) => [r.projectId, Number(r._sum?.amount ?? 0)]));
    const costMap = new Map(costAgg.map((r) => [r.projectId, Number(r._sum?.totalAmount ?? 0)]));
    const revenueMap = new Map(revenueAgg.map((r) => [r.projectId, Number(r._sum?.totalAmount ?? 0)]));
    const riskMap = new Map(riskAgg.map((r) => [r.projectId, r._max?.score ?? null]));

    return projects.map((p) => {
      const budget = budgetMap.get(p.id) ?? 0;
      const actual = costMap.get(p.id) ?? 0;
      const revenue = revenueMap.get(p.id) ?? 0;
      const contract = p.contractValue != null ? Number(p.contractValue) : 0;
      const utilization = contract > 0 ? Math.round((actual / contract) * 1000) / 10 : 0;
      const variance = Math.round((budget - actual) * 100) / 100;
      const health: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' | 'NO_BUDGET' =
        budget <= 0 ? 'NO_BUDGET' : actual > budget ? 'CRITICAL' : actual / budget > 0.9 ? 'AT_RISK' : 'ON_TRACK';
      const rollup = evmMap.get(p.id);
      return {
        projectId: p.id,
        projectCode: p.code,
        projectName: p.name,
        client: p.client ?? '—',
        health,
        contractValue: Math.round(contract * 100) / 100,
        budget: Math.round(budget * 100) / 100,
        actual: Math.round(actual * 100) / 100,
        variance,
        revenue: Math.round(revenue * 100) / 100,
        utilization,
        progressPct: budget > 0 ? Math.min(100, Math.round((actual / budget) * 1000) / 10) : 0,
        cpi: rollup?.cpi ?? null,
        spi: rollup?.spi ?? null,
        hasEvm: rollup?.hasEvm ?? false,
        riskScore: riskMap.get(p.id) ?? null,
      };
    });
  }

  private async loadPendingApprovals(now: Date): Promise<ControlTowerException[]> {
    const rows = await this.prisma.approvalTask.findMany({
      where: { status: 'PENDING' },
      select: { id: true, transactionType: true, transactionCode: true, stepName: true, createdAt: true, dueAt: true },
      take: 50,
    });
    return rows.map((t) => {
      const { ageDays, slaDays, overdue } = slaState(new Date(t.createdAt), t.dueAt ? new Date(t.dueAt) : null, now);
      const severity: ControlTowerException['severity'] = overdue ? 'HIGH' : ageDays > 3 ? 'MEDIUM' : 'LOW';
      return {
        key: `approval-${t.id}`,
        severity,
        type: 'Approval SLA',
        documentCode: t.transactionCode ?? null,
        domain: 'Procurement',
        ageDays,
        slaDays: slaDays ?? DEFAULT_SLA_DAYS,
        overdue,
        to: '/approvals',
      };
    });
  }

  private async loadOverdueNcrs(now: Date, projectWhere: Record<string, unknown>): Promise<ControlTowerException[]> {
    const rows = await this.prisma.ncr.findMany({
      where: { status: { not: 'CLOSED' }, ...projectWhere },
      select: { id: true, ncrNumber: true, severity: true, createdAt: true },
      take: 50,
    });
    return rows.map((n) => {
      const ageDays = daysBetween(new Date(n.createdAt), now);
      const overdue = ageDays > 14;
      const severity: ControlTowerException['severity'] = n.severity === 'CRITICAL' || overdue ? 'HIGH' : n.severity === 'MAJOR' ? 'MEDIUM' : 'LOW';
      return {
        key: `ncr-${n.id}`,
        severity,
        type: 'NCR overdue',
        documentCode: n.ncrNumber,
        domain: 'Quality',
        ageDays,
        slaDays: 14,
        overdue,
        to: '/quality?tab=ncrs&status=OPEN',
      };
    });
  }

  private async loadOpenIncidents(now: Date, projectWhere: Record<string, unknown>): Promise<ControlTowerException[]> {
    const rows = await this.prisma.hseIncident.findMany({
      where: { status: { not: 'RESOLVED' }, ...projectWhere },
      select: { id: true, incidentNumber: true, severity: true, createdAt: true },
      take: 50,
    });
    return rows.map((i) => {
      const ageDays = daysBetween(new Date(i.createdAt), now);
      const overdue = ageDays > 14;
      const severity: ControlTowerException['severity'] = i.severity === 'CRITICAL' || i.severity === 'HIGH' ? 'HIGH' : i.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW';
      return {
        key: `incident-${i.id}`,
        severity,
        type: 'Incident open',
        documentCode: i.incidentNumber,
        domain: 'HSE',
        ageDays,
        slaDays: 14,
        overdue,
        to: '/hse?tab=incidents&status=OPEN',
      };
    });
  }

  private async loadOverdueCorrectiveActions(now: Date, projectWhere: Record<string, unknown>): Promise<ControlTowerException[]> {
    const rows = await this.prisma.correctiveAction.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, dueDate: { lt: now } },
      select: { id: true, action: true, dueDate: true, createdAt: true, incident: { select: { incidentNumber: true, project: { select: { legalEntityId: true } } } } },
      take: 50,
    });
    const filtered = 'project' in projectWhere
      ? rows.filter((r) => r.incident?.project?.legalEntityId === (projectWhere.project as { legalEntityId: string }).legalEntityId)
      : rows;
    return filtered.map((c) => {
      const { ageDays, slaDays, overdue } = slaState(new Date(c.createdAt), new Date(c.dueDate), now);
      return {
        key: `ca-${c.id}`,
        severity: overdue ? 'MEDIUM' : 'LOW',
        type: 'Corrective action due',
        documentCode: c.incident?.incidentNumber ?? null,
        domain: 'HSE',
        ageDays,
        slaDays: slaDays ?? DEFAULT_SLA_DAYS,
        overdue,
        to: '/hse',
      };
    });
  }

  private async loadExpiringGuarantees(now: Date, entityWhere: Record<string, unknown>): Promise<ControlTowerException[]> {
    const horizon = new Date(now.getTime() + 30 * 86_400_000);
    const rows = await this.prisma.bankGuarantee.findMany({
      where: { status: 'ACTIVE', expiryDate: { lte: horizon, not: null }, ...entityWhere },
      select: { id: true, guaranteeNumber: true, expiryDate: true, createdAt: true, guaranteeType: true },
      take: 50,
    });
    return rows.map((g) => {
      const expiry = g.expiryDate ? new Date(g.expiryDate) : now;
      const daysLeft = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 86_400_000));
      return {
        key: `bg-${g.id}`,
        severity: daysLeft <= 7 ? 'HIGH' : 'MEDIUM',
        type: 'Bank guarantee expiring',
        documentCode: g.guaranteeNumber,
        domain: 'Treasury',
        ageDays: 30 - daysLeft,
        slaDays: 30,
        overdue: daysLeft <= 7,
        to: '/treasury',
      };
    });
  }

  private async loadTreasury(entityWhere: Record<string, unknown>) {
    const [cashPositions, fx, bgActive, period] = await Promise.all([
      this.prisma.cashPosition.findMany({ where: entityWhere, select: { currentBalance: true } }),
      this.prisma.fxExposure.findMany({ where: entityWhere, select: { currency: true, exposureAmount: true, rate: true } }),
      this.prisma.bankGuarantee.findMany({ where: { status: 'ACTIVE', ...entityWhere }, select: { amount: true, expiryDate: true } }),
      this.prisma.fiscalPeriod.findFirst({ orderBy: { periodCode: 'desc' }, select: { periodCode: true, status: true } }),
    ]);
    const now = new Date();
    const horizon = new Date(now.getTime() + 30 * 86_400_000);
    const expiring = bgActive.filter((b) => b.expiryDate && new Date(b.expiryDate) <= horizon);
    const totalBg = bgActive.reduce((s, b) => s + Number(b.amount), 0);
    return {
      cashOnHand: cashPositions.reduce((s, c) => s + Number(c.currentBalance), 0),
      fxExposureValue: fx.reduce((s, f) => s + Number(f.exposureAmount) * Number(f.rate), 0),
      fxExposureByCurrency: fx.map((f) => ({ currency: f.currency, amount: Number(f.exposureAmount), rate: Number(f.rate) })),
      bgExpiringCount: expiring.length,
      bgExpiringValue: expiring.reduce((s, b) => s + Number(b.amount), 0),
      bgUtilisationPct: totalBg > 0 ? Math.round((expiring.reduce((s, b) => s + Number(b.amount), 0) / totalBg) * 1000) / 10 : null,
      periodCloseStatus: period?.status ?? null,
      periodCloseProgressPct: null,
    };
  }

  private async loadProcurement(now: Date, projectWhere: Record<string, unknown>) {
    const [openPo, pendingPr, rfqDue, ratings] = await Promise.all([
      this.prisma.purchaseOrder.findMany({ where: { status: { in: ['APPROVED', 'RELEASED'] }, ...projectWhere }, select: { totalAmount: true } }),
      this.prisma.purchaseRequisition.count({ where: { status: { in: ['DRAFT', 'SUBMITTED'] }, ...projectWhere } }),
      this.prisma.rfq.count({ where: { dueDate: { lte: new Date(now.getTime() + 14 * 86_400_000), not: null }, status: { notIn: ['AWARDED', 'CANCELLED'] }, ...projectWhere } }),
      this.prisma.vendorPerformanceRating.findMany({ select: { score: true, vendor: { select: { name: true } } } }),
    ]);
    const avgScore = ratings.length > 0 ? Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10 : null;
    const byVendor = new Map<string, { sum: number; n: number }>();
    for (const r of ratings) {
      const cur = byVendor.get(r.vendor.name) ?? { sum: 0, n: 0 };
      cur.sum += r.score;
      cur.n += 1;
      byVendor.set(r.vendor.name, cur);
    }
    let topVendorName: string | null = null;
    let topVendorScore: number | null = null;
    for (const [name, agg] of byVendor) {
      const avg = agg.sum / agg.n;
      if (topVendorScore == null || avg > topVendorScore) {
        topVendorScore = Math.round(avg * 100) / 100;
        topVendorName = name;
      }
    }
    return {
      openPoValue: openPo.reduce((s, p) => s + Number(p.totalAmount), 0),
      openPoCount: openPo.length,
      pendingPrCount: pendingPr,
      rfqDueCount: rfqDue,
      avgVendorScore: avgScore,
      topVendorName,
      topVendorScore,
    };
  }

  private async loadHcm(now: Date, projectWhere: Record<string, unknown>) {
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const [
      activeEmployees,
      pendingTimesheets,
      latestReports,
      utilization,
      openBreakdowns,
      incidents,
      highSeverityOpen,
      overdueCa,
      openCa,
      ncrs,
      criticalNcrs,
      punch,
      lastIncident,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.timesheet.count({ where: { status: 'SUBMITTED', ...projectWhere } }),
      this.prisma.constructionDailyReport.findMany({ where: { reportDate: { gte: new Date(todayStart.getTime() - 7 * 86_400_000) } }, select: { manpowerTotal: true, reportDate: true }, orderBy: { reportDate: 'desc' }, take: 5 }),
      this.prisma.equipmentUtilization.findMany({ where: { utilizationDate: { gte: new Date(now.getTime() - 30 * 86_400_000) } }, select: { availableHours: true, operatingHours: true } }),
      this.prisma.equipmentBreakdown.count({ where: { status: 'OPEN' } }),
      this.prisma.hseIncident.count({ where: { status: { not: 'RESOLVED' }, ...projectWhere } }),
      this.prisma.hseIncident.count({ where: { status: { not: 'RESOLVED' }, severity: { in: ['HIGH', 'CRITICAL'] }, ...projectWhere } }),
      this.prisma.correctiveAction.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, dueDate: { lt: now } } }),
      this.prisma.correctiveAction.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.ncr.count({ where: { status: { not: 'CLOSED' }, ...projectWhere } }),
      this.prisma.ncr.count({ where: { status: { not: 'CLOSED' }, severity: 'CRITICAL', ...projectWhere } }),
      this.prisma.punchListItem.count({ where: { status: 'OPEN', ...projectWhere } }),
      this.prisma.hseIncident.findFirst({ orderBy: { incidentDate: 'desc' }, select: { incidentDate: true } }),
    ]);
    const avail = utilization.reduce((s, u) => s + Number(u.availableHours), 0);
    const op = utilization.reduce((s, u) => s + Number(u.operatingHours), 0);
    const equipmentUtilizationPct = avail > 0 ? Math.round((op / avail) * 1000) / 10 : null;
    const manpowerToday = latestReports[0]?.manpowerTotal ?? 0;
    // TRIR = (jumlah insiden × 200.000) / total jam kerja proyek. Basis jam
    // memakai total manpower harian × hari kerja (bukan hanya jumlah karyawan
    // terdaftar), karena di proyek EPC tenaga kerja lapangan jauh lebih besar
    // dari jumlah employee di master data.
    const projectHours = Math.max(1, manpowerToday > 0 ? manpowerToday * 2000 : activeEmployees * 2000);
    const trir = Math.round(((incidents * 200000) / projectHours) * 100) / 100;
    const daysSinceLastIncident = lastIncident ? daysBetween(new Date(lastIncident.incidentDate), now) : null;
    return {
      equipmentUtilizationPct,
      manpowerToday,
      trir,
      safety: { openIncidents: incidents, highSeverityOpen, openCorrectiveActions: openCa, overdueCorrectiveActions: overdueCa, trir, daysSinceLastIncident },
      quality: { openNcrs: ncrs, criticalNcrs, openPunchItems: punch },
      hcm: { activeEmployees, manpowerToday, pendingTimesheets, equipmentUtilizationPct, openBreakdowns },
    };
  }

  private async loadGovernance(projectWhere: Record<string, unknown>) {
    const [openRisks, highRisks, overdueAudit, openLegal, riskRows] = await Promise.all([
      this.prisma.risk.count({ where: { status: 'OPEN', ...projectWhere } }),
      this.prisma.risk.count({ where: { status: 'OPEN', score: { gte: 15 }, ...projectWhere } }),
      this.prisma.auditFinding.count({ where: { status: { notIn: ['RESOLVED', 'VERIFIED'] }, followUpDate: { lt: new Date() } } }),
      this.prisma.legalCase.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.risk.findMany({ where: { status: 'OPEN' }, select: { likelihood: true, impact: true } }),
    ]);
    const matrix = new Map<string, number>();
    for (const r of riskRows) {
      const k = `${r.likelihood}:${r.impact}`;
      matrix.set(k, (matrix.get(k) ?? 0) + 1);
    }
    const riskMatrix: { likelihood: number; impact: number; count: number }[] = [];
    for (let l = 1; l <= 5; l++) for (let i = 1; i <= 5; i++) {
      const count = matrix.get(`${l}:${i}`) ?? 0;
      if (count > 0) riskMatrix.push({ likelihood: l, impact: i, count });
    }
    return { openRisks, highRisks, overdueAuditFindings: overdueAudit, openLegalCases: openLegal, riskMatrix };
  }

  /**
   * Ringkasan inventory: nilai stok bersih, jumlah gudang, dan mutasi masuk/keluar.
   *
   * `stockValue` = jumlah besaran masuk dikurangi jumlah besaran keluar
   * (`|IN| − |OUT|`) — nilai stok **bersih**, bukan nilai bruto seluruh
   * pergerakan (yang sudah diwakili `movementIn/OutValue`). Baris ADJUSTMENT
   * tidak dihitung di sini; ini selisih mutasi pada jendela filter, bukan
   * saldo on-hand.
   * `negativeBalanceCount` = jumlah gudang (unik) yang punya minimal satu baris
   * ledger dengan `balanceAfter < 0` — sinyal data-error nyata, bukan nol palsu.
   * Selalu mengembalikan angka (0), tidak pernah null.
   */
  private async loadInventory(projectWhere: Record<string, unknown>, dateWhere?: { gte?: Date; lte?: Date }) {
    const ledgerWhere = { ...projectWhere, ...(dateWhere ? { createdAt: dateWhere } : {}) };
    const [warehouseCount, movementGroups, negativeRows] = await Promise.all([
      this.prisma.warehouse.count({ where: projectWhere }),
      this.prisma.stockLedgerEntry.groupBy({
        by: ['movementType'],
        where: ledgerWhere,
        _sum: { totalValue: true },
      }),
      this.prisma.stockLedgerEntry.findMany({
        where: { ...ledgerWhere, balanceAfter: { lt: 0 } },
        select: { warehouseId: true },
      }),
    ]);
    const round2 = (n: number) => Math.round(n * 100) / 100;
    // `totalValue` tidak dijamin bertanda (lihat ActualCostCalculator yang memakai
    // Math.abs pada OUT), jadi ambil besaran per jenis lalu hitung net eksplisit.
    const magnitudeFor = (type: string) =>
      Math.abs(Number(movementGroups.find((g) => g.movementType === type)?._sum?.totalValue ?? 0));
    const movementInValue = magnitudeFor('IN');
    const movementOutValue = magnitudeFor('OUT');
    // Nilai stok bersih = masuk − keluar (bukan nilai bruto seluruh pergerakan,
    // yang sudah diwakili movementIn/OutValue). Negatif = anomali (keluar > masuk).
    const stockValue = movementInValue - movementOutValue;
    const negativeBalanceCount = new Set(negativeRows.map((r) => r.warehouseId)).size;
    return {
      stockValue: round2(stockValue),
      warehouseCount,
      negativeBalanceCount,
      movementInValue: round2(movementInValue),
      movementOutValue: round2(movementOutValue),
    };
  }

  private async loadCommercial(now: Date, dateWhere?: { gte?: Date; lte?: Date }) {
    const [opps, won, lost, tendersDue, variations] = await Promise.all([
      this.prisma.opportunity.findMany({ where: { status: 'OPEN' }, select: { stage: true, expectedValue: true } }),
      this.prisma.opportunity.aggregate({ where: { status: 'CLOSED_WON' }, _sum: { expectedValue: true }, _count: { _all: true } }),
      this.prisma.opportunity.aggregate({ where: { status: 'CLOSED_LOST' }, _sum: { expectedValue: true }, _count: { _all: true } }),
      this.prisma.tenderSubmission.count({ where: { submittedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } } }),
      this.prisma.projectVariation.aggregate({ where: { status: 'APPROVED', ...(dateWhere ? { createdAt: dateWhere } : {}) }, _sum: { amountChange: true } }),
    ]);
    const stages = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'];
    const funnel = stages.map((stage) => {
      const items = opps.filter((o) => o.stage === stage);
      return { stage, count: items.length, value: items.reduce((s, o) => s + Number(o.expectedValue), 0) };
    });
    const wonCount = won._count._all;
    const lostCount = lost._count._all;
    const winRatePct = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 1000) / 10 : null;
    return {
      pipelineValue: opps.reduce((s, o) => s + Number(o.expectedValue), 0),
      openOpportunities: opps.length,
      wonValue: Number(won._sum.expectedValue ?? 0),
      lostValue: Number(lost._sum.expectedValue ?? 0),
      winRatePct,
      tendersDue,
      approvedVariationValue: Number(variations._sum.amountChange ?? 0),
      funnel,
    };
  }
}
