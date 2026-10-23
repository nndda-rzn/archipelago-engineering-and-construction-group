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
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

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

    /**
     * CPI/SPI untuk menilai kesehatan. Sumbernya sama dengan EarnedValueService
     * agar dua halaman tidak memberi status berbeda untuk proyek yang sama:
     * PV dari ControlAccount.plannedValue, EV = BAC x progres fisik.
     */
    const pvAgg = await this.prisma.controlAccount.aggregate({ where: { projectId: id }, _sum: { plannedValue: true } });
    const pv = Number(pvAgg._sum?.plannedValue ?? 0);

    const wpAgg = await this.prisma.workPackageProgress.groupBy({ by: ['workPackageId'], _max: { physicalProgress: true } });
    const wpIds = wpAgg.map((r) => r.workPackageId);
    const wps = wpIds.length
      ? await this.prisma.constructionWorkPackage.findMany({ where: { id: { in: wpIds } }, select: { id: true, projectId: true } })
      : [];
    const wpInProject = new Set(wps.filter((w) => w.projectId === id).map((w) => w.id));
    const progresses = wpAgg.filter((r) => wpInProject.has(r.workPackageId));
    const avgProgress = progresses.length
      ? progresses.reduce((s, r) => s + Number(r._max.physicalProgress ?? 0), 0) / progresses.length
      : 0;
    const progressPercent = Math.min(avgProgress, 100);

    const ev = totalBudget * (progressPercent / 100);
    const cpi = totalActual > 0 ? ev / totalActual : null;
    const spi = pv > 0 ? ev / pv : null;
    const utilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : null;
    const { health, partial } = classifyHealth(cpi, spi, utilization);

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
      /** True bila SPI tidak tersedia sehingga status hanya dari CPI. */
      partial,
      cpi: cpi != null ? Math.round(cpi * 100) / 100 : null,
      spi: spi != null ? Math.round(spi * 100) / 100 : null,
      ev,
      pv,
      progressPercent: Math.round(progressPercent * 10) / 10,
      wbs: wbsRows,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Kesehatan seluruh portofolio dalam satu payload.
   *
   * Halaman Health butuh 12 proyek sekaligus; memanggil `health()` 12 kali dari
   * klien membuat rate limiter menolak permintaan ke-4 (terbukti saat pengukuran).
   * Agregasi di server juga menjamin kelima dimensi dihitung dari snapshot yang
   * sama, bukan dari 12 titik waktu berbeda.
   */
  async portfolio() {
    const projects = await this.prisma.project.findMany({
      select: { id: true, code: true, name: true, contractValue: true, legalEntity: { select: { code: true } } },
      orderBy: { code: 'asc' },
    });

    const [budgetGroups, actualByProject, pvGroups, domainCounts] = await Promise.all([
      this.prisma.budgetItem.groupBy({
        by: ['projectId'],
        where: { status: 'PUBLISHED' },
        _sum: { amount: true },
      }),
      this.actualCost.computeBatch(projects.map((p) => p.id)),
      this.prisma.controlAccount.groupBy({ by: ['projectId'], _sum: { plannedValue: true } }),
      this.domainCounts(projects.map((p) => p.id)),
    ]);

    const budgetMap = new Map(budgetGroups.map((b) => [b.projectId, Number(b._sum?.amount ?? 0)]));
    const pvMap = new Map(pvGroups.map((g) => [g.projectId, Number(g._sum?.plannedValue ?? 0)]));

    const progressMap = await this.progressByProject(projects.map((p) => p.id));

    const items = projects.map((p) => {
      const bac = budgetMap.get(p.id) ?? 0;
      const ac = actualByProject.get(p.id) ?? 0;
      const pv = pvMap.get(p.id) ?? 0;
      const progress = progressMap.get(p.id) ?? 0;
      const ev = bac * (progress / 100);
      const cpi = ac > 0 ? ev / ac : null;
      const spi = pv > 0 ? ev / pv : null;
      const utilization = bac > 0 ? (ac / bac) * 100 : null;
      const { health, partial } = classifyHealth(cpi, spi, utilization);
      const d = domainCounts.get(p.id) ?? { ncrs: 0, incidents: 0, risks: 0 };

      return {
        projectId: p.id,
        code: p.code,
        name: p.name,
        legalEntityCode: p.legalEntity.code,
        contractValue: Number(p.contractValue ?? 0),
        bac,
        pv,
        ev,
        ac,
        cpi: cpi != null ? Math.round(cpi * 100) / 100 : null,
        spi: spi != null ? Math.round(spi * 100) / 100 : null,
        utilization: utilization != null ? Math.round(utilization * 10) / 10 : null,
        progressPercent: Math.round(progress * 10) / 10,
        ncrs: d.ncrs,
        incidents: d.incidents,
        risks: d.risks,
        health,
        partial,
      };
    });

    const countByHealth = { NO_BUDGET: 0, ON_TRACK: 0, AT_RISK: 0, CRITICAL: 0 };
    for (const i of items) countByHealth[i.health] += 1;

    return { items, countByHealth, generatedAt: new Date().toISOString() };
  }

  /** Progres fisik rata-rata per proyek, dari WorkPackageProgress. */
  private async progressByProject(projectIds: string[]): Promise<Map<string, number>> {
    if (projectIds.length === 0) return new Map();
    const agg = await this.prisma.workPackageProgress.groupBy({
      by: ['workPackageId'],
      _max: { physicalProgress: true },
    });
    if (agg.length === 0) return new Map();

    const wps = await this.prisma.constructionWorkPackage.findMany({
      where: { id: { in: agg.map((a) => a.workPackageId) }, projectId: { in: projectIds } },
      select: { id: true, projectId: true },
    });
    const projectOf = new Map(wps.map((w) => [w.id, w.projectId]));

    const sum = new Map<string, { total: number; n: number }>();
    for (const a of agg) {
      const pid = projectOf.get(a.workPackageId);
      if (!pid) continue;
      const cur = sum.get(pid) ?? { total: 0, n: 0 };
      cur.total += Number(a._max.physicalProgress ?? 0);
      cur.n += 1;
      sum.set(pid, cur);
    }

    const out = new Map<string, number>();
    for (const [pid, s] of sum) out.set(pid, s.n > 0 ? Math.min(s.total / s.n, 100) : 0);
    return out;
  }

  /**
   * Hitungan kualitas, safety, dan risiko per proyek. Ini yang membuat health
   * punya lebih dari satu dimensi — CPI/SPI saja bisa menyesatkan (AACE).
   */
  private async domainCounts(projectIds: string[]): Promise<Map<string, { ncrs: number; incidents: number; risks: number }>> {
    const out = new Map<string, { ncrs: number; incidents: number; risks: number }>();
    if (projectIds.length === 0) return out;
    for (const id of projectIds) out.set(id, { ncrs: 0, incidents: 0, risks: 0 });

    const [ncrs, incidents, risks] = await Promise.all([
      this.prisma.ncr.groupBy({ by: ['projectId'], where: { projectId: { in: projectIds }, status: { not: 'CLOSED' } }, _count: { _all: true } }),
      this.prisma.hseIncident.groupBy({ by: ['projectId'], where: { projectId: { in: projectIds } }, _count: { _all: true } }),
      this.prisma.risk.groupBy({ by: ['projectId'], where: { projectId: { in: projectIds }, status: { not: 'CLOSED' } }, _count: { _all: true } }),
    ]);

    for (const r of ncrs) {
      const cur = out.get(r.projectId);
      if (cur) cur.ncrs = r._count._all;
    }
    for (const r of incidents) {
      const cur = out.get(r.projectId);
      if (cur) cur.incidents = r._count._all;
    }
    for (const r of risks) {
      const cur = out.get(r.projectId);
      if (cur) cur.risks = r._count._all;
    }
    return out;
  }
}
