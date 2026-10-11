import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { ActualCostCalculator } from '@/shared/project/actual-cost.calculator';
import type { AddStakeholderDto, AdvancePhaseDto, CreateMilestoneDto, UpdateMilestoneDto } from '../../presentation/dto/project.dto';

/** Satu baris "at a glance" — angka + tone, tanpa logika tampilan. */
type GlanceSignal = { key: string; label: string; value: number | null; unit: string; tone: 'ok' | 'warn' | 'bad' | 'neutral' };

@Injectable()
export class ProjectCommandCenterService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ActualCostCalculator) private readonly actualCost: ActualCostCalculator,
  ) {}

  /**
   * Ringkasan command center: fase, jadwal (rencana vs aktual), biaya, dan
   * hitungan lintas domain + sinyal "at a glance" yang sudah ber-tone.
   */
  async summary(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        legalEntity: { select: { code: true, legalName: true } },
        managerRef: { select: { id: true, name: true, position: true } },
        directorRef: { select: { id: true, name: true, position: true } },
      },
    });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const [
      budgetAgg, actual, poAgg, subconAgg,
      claimsAgg, invoicesAgg, collectionsAgg,
      riskOpen, ncrOpen, hseOpen, punchOpen,
      prCount, poCount, viCount, subCount, varCount,
      wpCount, dailyCount, drawingCount, delivCount, contractCount,
      milestoneTotal, milestoneAchieved, milestoneMissed,
      gateHold,
      riskCells, ncrBySeverity, hseBySeverity, drawingsByStatus, delivByStatus, variationAgg,
    ] = await Promise.all([
      this.prisma.budgetItem.aggregate({ where: { projectId: id, status: 'PUBLISHED' }, _sum: { amount: true } }),
      this.actualCost.compute(id),
      this.prisma.purchaseOrder.aggregate({ where: { projectId: id, status: 'RELEASED' }, _sum: { totalAmount: true } }),
      this.prisma.subcontract.aggregate({ where: { projectId: id, status: 'ACTIVE' }, _sum: { contractValue: true } }),
      this.prisma.progressClaim.aggregate({ where: { projectId: id, status: 'CERTIFIED' }, _sum: { certifiedAmount: true } }),
      this.prisma.clientInvoice.aggregate({ where: { projectId: id, status: { in: ['POSTED', 'PAID'] } }, _sum: { totalAmount: true } }),
      this.prisma.clientInvoice.aggregate({ where: { projectId: id, status: 'PAID' }, _sum: { totalAmount: true } }),
      this.prisma.risk.count({ where: { projectId: id, status: 'OPEN' } }),
      this.prisma.ncr.count({ where: { projectId: id, status: 'OPEN' } }),
      this.prisma.hseIncident.count({ where: { projectId: id, status: 'OPEN' } }),
      this.prisma.punchListItem.count({ where: { projectId: id, status: { not: 'CLOSED' } } }).catch(() => 0),
      this.prisma.purchaseRequisition.count({ where: { projectId: id } }),
      this.prisma.purchaseOrder.count({ where: { projectId: id } }),
      this.prisma.vendorInvoice.count({ where: { projectId: id } }),
      this.prisma.subcontract.count({ where: { projectId: id } }),
      this.prisma.projectVariation.count({ where: { projectId: id } }),
      this.prisma.constructionWorkPackage.count({ where: { projectId: id } }),
      this.prisma.constructionDailyReport.count({ where: { projectId: id } }),
      this.prisma.drawing.count({ where: { projectId: id } }),
      this.prisma.deliverable.count({ where: { projectId: id } }),
      this.prisma.contract.count({ where: { projectId: id } }),
      this.prisma.projectMilestone.count({ where: { projectId: id } }),
      this.prisma.projectMilestone.count({ where: { projectId: id, status: 'ACHIEVED' } }),
      this.prisma.projectMilestone.count({ where: { projectId: id, status: 'MISSED' } }),
      this.prisma.stageGateReview.count({ where: { projectId: id, decision: 'HOLD' } }),
      // Distribusi (FT: "distribution") + korelasi (risk heatmap)
      this.prisma.risk.groupBy({ by: ['likelihood', 'impact'], where: { projectId: id, status: 'OPEN' }, _count: { _all: true } }),
      this.prisma.ncr.groupBy({ by: ['severity'], where: { projectId: id }, _count: { _all: true } }),
      this.prisma.hseIncident.groupBy({ by: ['severity'], where: { projectId: id }, _count: { _all: true } }),
      this.prisma.drawing.groupBy({ by: ['status'], where: { projectId: id }, _count: { _all: true } }),
      this.prisma.deliverable.groupBy({ by: ['status'], where: { projectId: id }, _count: { _all: true } }),
      this.prisma.projectVariation.aggregate({ where: { projectId: id, status: 'APPROVED' }, _sum: { amountChange: true } }),
    ]);

    const contractValue = Number(project.contractValue ?? 0);
    const budget = Number(budgetAgg._sum?.amount ?? 0);
    const committed = Number(poAgg._sum?.totalAmount ?? 0) + Number(subconAgg._sum?.contractValue ?? 0);
    const certified = Number(claimsAgg._sum?.certifiedAmount ?? 0);
    const billed = Number(invoicesAgg._sum?.totalAmount ?? 0);
    const collected = Number(collectionsAgg._sum?.totalAmount ?? 0);

    const progressPlanned = Number(project.progressPlanned);
    const progressActual = Number(project.progressActual);
    const scheduleVariance = Math.round((progressActual - progressPlanned) * 10) / 10;
    const cpi = actual > 0 && budget > 0 ? Math.round(((progressActual / 100) * budget / actual) * 100) / 100 : null;

    const glance: GlanceSignal[] = [
      { key: 'schedule', label: 'Schedule', value: scheduleVariance, unit: 'pts', tone: scheduleVariance >= 0 ? 'ok' : scheduleVariance >= -10 ? 'warn' : 'bad' },
      { key: 'cpi', label: 'CPI', value: cpi, unit: '', tone: cpi == null ? 'neutral' : cpi >= 1 ? 'ok' : cpi >= 0.9 ? 'warn' : 'bad' },
      { key: 'risk', label: 'Open risks', value: riskOpen, unit: '', tone: riskOpen === 0 ? 'ok' : riskOpen <= 3 ? 'warn' : 'bad' },
      { key: 'quality', label: 'Open NCR', value: ncrOpen, unit: '', tone: ncrOpen === 0 ? 'ok' : 'warn' },
      { key: 'hse', label: 'Open HSE', value: hseOpen, unit: '', tone: hseOpen === 0 ? 'ok' : 'warn' },
      { key: 'milestones', label: 'Milestones', value: milestoneAchieved, unit: `/${milestoneTotal}`, tone: milestoneMissed > 0 ? 'warn' : 'ok' },
    ];

    return {
      project: {
        id: project.id, code: project.code, name: project.name, client: project.client,
        status: project.status, phase: project.phase, healthStatus: project.healthStatus,
        type: project.type, priority: project.priority, currency: project.currency,
        location: project.location, legalEntityCode: project.legalEntity.code,
        manager: project.managerRef, director: project.directorRef,
        startDate: project.startDate?.toISOString() ?? null,
        completionDate: project.completionDate?.toISOString() ?? null,
      },
      schedule: { progressPlanned, progressActual, variance: scheduleVariance, milestoneTotal, milestoneAchieved, milestoneMissed, gateHold },
      cost: { contractValue, budget, committed, actual, certified, billed, collected, cpi },
      signals: glance,
      domains: {
        commercial: { contract: contractCount, progressClaim: certified, clientInvoice: billed, collection: collected, variation: varCount },
        procurement: { pr: prCount, po: poCount, vendorInvoice: viCount, subcontract: subCount },
        execution: { workPackage: wpCount, dailyReport: dailyCount },
        quality: { ncrOpen, punchOpen },
        hse: { incidentOpen: hseOpen },
        governance: { riskOpen, gateHold },
        engineering: { drawing: drawingCount, deliverable: delivCount },
      },
      analytics: {
        // Korelasi: risk terbuka per sel likelihood × impact (heatmap 5×5).
        riskMatrix: riskCells.map((c) => ({ likelihood: c.likelihood, impact: c.impact, count: c._count._all })),
        // Distribusi kategori (severity/status) untuk bar.
        qualityMix: ncrBySeverity.map((g) => ({ key: g.severity, count: g._count._all })),
        hseMix: hseBySeverity.map((g) => ({ key: g.severity, count: g._count._all })),
        documentsMix: [
          ...drawingsByStatus.map((g) => ({ key: `Drawing:${g.status}`, count: g._count._all })),
          ...delivByStatus.map((g) => ({ key: `Deliverable:${g.status}`, count: g._count._all })),
        ],
        // Bagian-dari-keseluruhan: penagihan & perubahan.
        billing: { certified, billed, collected, approvedVariation: Number(variationAgg._sum?.amountChange ?? 0) },
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Rincian per domain: daftar ringkas (bukan tabel penuh) untuk tab domain —
   * executive/quality/HSE/documents/risk. Tiap item punya status agar bisa
   * diberi tone. Semua dibatasi 20 baris terbaru.
   */
  async domains(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const [workPackages, dailyReports, ncrs, punchItems, incidents, observations, permits, drawings, deliverables, risks, legalCases, contracts, claims, invoices, collections, variations, prs, pos, vendorInvoices, subcontracts] = await Promise.all([
      this.prisma.constructionWorkPackage.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, wpNumber: true, title: true, status: true, progress: { orderBy: { createdAt: 'desc' }, take: 1, select: { physicalProgress: true } } } }),
      this.prisma.constructionDailyReport.findMany({ where: { projectId: id }, orderBy: { reportDate: 'desc' }, take: 20, select: { id: true, drNumber: true, reportDate: true, status: true } }),
      this.prisma.ncr.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, ncrNumber: true, description: true, severity: true, status: true } }),
      this.prisma.punchListItem.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, punchNumber: true, description: true, status: true } }),
      this.prisma.hseIncident.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, incidentNumber: true, type: true, severity: true, status: true } }),
      this.prisma.safetyObservation.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, observationNumber: true, description: true, status: true } }),
      this.prisma.permitToWork.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, permitNumber: true, area: true, status: true } }),
      this.prisma.drawing.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, drawingNumber: true, title: true, discipline: true, status: true, isIFC: true } }),
      this.prisma.deliverable.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, deliverableNumber: true, title: true, discipline: true, status: true } }),
      this.prisma.risk.findMany({ where: { projectId: id }, orderBy: { score: 'desc' }, take: 20, select: { id: true, riskNumber: true, title: true, category: true, likelihood: true, impact: true, score: true, status: true } }),
      this.prisma.legalCase.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, caseNumber: true, title: true, status: true } }),
      this.prisma.contract.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, contractNumber: true, title: true, value: true, status: true } }),
      this.prisma.progressClaim.findMany({ where: { projectId: id }, orderBy: { claimDate: 'desc' }, take: 20, select: { id: true, claimNumber: true, period: true, amount: true, certifiedAmount: true, status: true } }),
      this.prisma.clientInvoice.findMany({ where: { projectId: id }, orderBy: { invoiceDate: 'desc' }, take: 20, select: { id: true, invoiceNumber: true, totalAmount: true, status: true } }),
      this.prisma.collectionItem.findMany({ where: { collection: { projectId: id } }, take: 20, select: { id: true, amount: true } }).catch(() => []),
      this.prisma.projectVariation.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, variationNumber: true, title: true, amountChange: true, status: true } }),
      this.prisma.purchaseRequisition.findMany({ where: { projectId: id }, orderBy: { requestedAt: 'desc' }, take: 20, select: { id: true, prNumber: true, description: true, status: true } }),
      this.prisma.purchaseOrder.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, poNumber: true, vendor: true, totalAmount: true, status: true } }),
      this.prisma.vendorInvoice.findMany({ where: { projectId: id }, orderBy: { invoiceDate: 'desc' }, take: 20, select: { id: true, invoiceNumber: true, vendor: true, totalAmount: true, status: true } }),
      this.prisma.subcontract.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, subconNumber: true, vendor: true, contractValue: true, status: true } }),
    ]);

    return {
      commercial: {
        progressClaims: claims.map((c) => ({ id: c.id, ref: c.claimNumber, label: c.period ?? '', status: c.status, value: Number(c.certifiedAmount ?? c.amount) })),
        clientInvoices: invoices.map((i) => ({ id: i.id, ref: i.invoiceNumber, label: '', status: i.status, value: Number(i.totalAmount) })),
        collections: collections.map((c) => ({ id: c.id, ref: '', label: 'Collection', status: 'RECEIVED', value: Number(c.amount) })),
        variations: variations.map((v) => ({ id: v.id, ref: v.variationNumber, label: v.title, status: v.status, value: Number(v.amountChange) })),
      },
      procurement: {
        requisitions: prs.map((p) => ({ id: p.id, ref: p.prNumber, label: p.description ?? '', status: p.status })),
        purchaseOrders: pos.map((p) => ({ id: p.id, ref: p.poNumber, label: p.vendor, status: p.status, value: Number(p.totalAmount) })),
        vendorInvoices: vendorInvoices.map((v) => ({ id: v.id, ref: v.invoiceNumber, label: v.vendor, status: v.status, value: Number(v.totalAmount) })),
        subcontracts: subcontracts.map((s) => ({ id: s.id, ref: s.subconNumber, label: s.vendor, status: s.status, value: Number(s.contractValue) })),
      },
      execution: {
        workPackages: workPackages.map((w) => ({ id: w.id, ref: w.wpNumber, label: w.title, status: w.status, score: w.progress[0] ? Number(w.progress[0].physicalProgress) : undefined })),
        dailyReports: dailyReports.map((d) => ({ id: d.id, ref: d.drNumber, label: d.reportDate.toISOString().slice(0, 10), status: d.status })),
      },
      quality: {
        ncrs: ncrs.map((n) => ({ id: n.id, ref: n.ncrNumber, label: n.description ?? '', status: n.status, severity: n.severity })),
        punchItems: punchItems.map((p) => ({ id: p.id, ref: p.punchNumber, label: p.description, status: p.status })),
      },
      hse: {
        incidents: incidents.map((i) => ({ id: i.id, ref: i.incidentNumber, label: i.type, status: i.status, severity: i.severity })),
        observations: observations.map((o) => ({ id: o.id, ref: o.observationNumber, label: o.description ?? '', status: o.status })),
        permits: permits.map((p) => ({ id: p.id, ref: p.permitNumber, label: p.area, status: p.status })),
      },
      documents: {
        drawings: drawings.map((d) => ({ id: d.id, ref: d.drawingNumber, label: d.title, status: d.status, meta: d.discipline, flag: d.isIFC })),
        deliverables: deliverables.map((d) => ({ id: d.id, ref: d.deliverableNumber, label: d.title, status: d.status, meta: d.discipline })),
      },
      governance: {
        risks: risks.map((r) => ({ id: r.id, ref: r.riskNumber, label: r.title, status: r.status, meta: r.category, score: r.score, likelihood: r.likelihood, impact: r.impact })),
        legalCases: legalCases.map((l) => ({ id: l.id, ref: l.caseNumber, label: l.title, status: l.status })),
        contracts: contracts.map((c) => ({ id: c.id, ref: c.contractNumber, label: c.title, status: c.status, value: Number(c.value) })),
      },
    };
  }

  /**
   * Gantt: satu payload ber-jadwal — fase, milestone, paket kerja (ControlAccount
   * dengan baseline/dependency/critical path/progress), dan work package.
   * `links` = dependensi (predecessor → successor) untuk garis penghubung.
   */
  async gantt(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true, startDate: true, completionDate: true } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const [phases, milestones, controlAccounts, workPackages] = await Promise.all([
      this.prisma.projectPhaseHistory.findMany({ where: { projectId: id }, orderBy: { enteredAt: 'asc' } }),
      this.prisma.projectMilestone.findMany({ where: { projectId: id }, orderBy: { plannedDate: 'asc' } }),
      this.prisma.controlAccount.findMany({ where: { projectId: id }, orderBy: { scheduleStart: 'asc' } }),
      this.prisma.constructionWorkPackage.findMany({ where: { projectId: id }, orderBy: { startDate: 'asc' }, select: { id: true, wpNumber: true, title: true, startDate: true, endDate: true, baselineStart: true, baselineEnd: true, predecessorId: true, isCriticalPath: true, status: true, progress: { orderBy: { progressDate: 'desc' }, take: 1, select: { physicalProgress: true } } } }),
    ]);

    const rows: Array<Record<string, unknown>> = [];

    // Fase siklus hidup
    for (const ph of phases) {
      if (!ph.enteredAt) continue;
      rows.push({ id: `phase-${ph.id}`, group: 'Phase', label: ph.phase, start: ph.enteredAt.toISOString(), end: (ph.exitedAt ?? null)?.toISOString() ?? null, progress: null, isCriticalPath: false, baselineStart: null, baselineEnd: null });
    }
    // Milestone sebagai diamond (start = end = tanggal)
    for (const m of milestones) {
      rows.push({ id: `ms-${m.id}`, group: 'Milestone', label: m.name, start: m.plannedDate.toISOString(), end: m.actualDate?.toISOString() ?? m.plannedDate.toISOString(), progress: null, isCriticalPath: m.isCritical, milestone: true, baselineStart: null, baselineEnd: null, status: m.status });
    }
    // Paket kerja
    for (const ca of controlAccounts) {
      if (!ca.scheduleStart || !ca.scheduleEnd) continue;
      rows.push({
        id: `ca-${ca.id}`, group: 'Work package', label: ca.name, start: ca.scheduleStart.toISOString(), end: ca.scheduleEnd.toISOString(),
        progress: Number(ca.progressPercent), isCriticalPath: ca.isCriticalPath,
        baselineStart: ca.baselineStart?.toISOString() ?? null, baselineEnd: ca.baselineEnd?.toISOString() ?? null, status: ca.status,
      });
    }
    // Work package lapangan
    for (const wp of workPackages) {
      if (!wp.startDate || !wp.endDate) continue;
      rows.push({
        id: `wp-${wp.id}`, group: 'Field', label: wp.title, start: wp.startDate.toISOString(), end: wp.endDate.toISOString(),
        progress: wp.progress[0] ? Number(wp.progress[0].physicalProgress) : null, isCriticalPath: wp.isCriticalPath,
        baselineStart: wp.baselineStart?.toISOString() ?? null, baselineEnd: wp.baselineEnd?.toISOString() ?? null, status: wp.status,
      });
    }

    // Dependensi: predecessor → successor (berdasarkan urutan jadwal paket kerja)
    const links: Array<{ from: string; to: string; type: string; lagDays: number }> = [];
    for (const ca of controlAccounts) {
      if (ca.predecessorId) links.push({ from: `ca-${ca.predecessorId}`, to: `ca-${ca.id}`, type: ca.dependencyType, lagDays: ca.lagDays });
    }
    for (const wp of workPackages) {
      if (wp.predecessorId) links.push({ from: `wp-${wp.predecessorId}`, to: `wp-${wp.id}`, type: 'FS', lagDays: 0 });
    }

    return {
      projectId: id,
      startDate: project.startDate?.toISOString() ?? null,
      completionDate: project.completionDate?.toISOString() ?? null,
      rows,
      links,
    };
  }

  /** S-curve: budget rencana per periode (kumulatif) vs progress aktual kumulatif. */
  async schedule(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: { progressPlanned: true, progressActual: true, startDate: true } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const periods = await this.prisma.projectPeriodBudget.findMany({ where: { projectId: id }, orderBy: { period: 'asc' } });
    let cumulative = 0;
    const total = periods.reduce((s, p) => s + Number(p.plannedCost), 0);
    const plannedCurve = periods.map((p) => {
      cumulative += Number(p.plannedCost);
      return { period: p.period, planned: Number(p.plannedCost), plannedCumulative: cumulative, plannedPct: total > 0 ? Math.round((cumulative / total) * 1000) / 10 : 0 };
    });

    const [milestones, phases, gates, claims, journalLines] = await Promise.all([
      this.prisma.projectMilestone.findMany({ where: { projectId: id }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.projectPhaseHistory.findMany({ where: { projectId: id }, orderBy: { enteredAt: 'asc' } }),
      this.prisma.stageGateReview.findMany({ where: { projectId: id }, orderBy: { decidedAt: 'asc' } }),
      // Kurva aktual (a): progress fisik kumulatif dari progress claim per periode.
      this.prisma.progressClaim.findMany({ where: { projectId: id, status: 'CERTIFIED' }, select: { period: true, certifiedAmount: true, amount: true, physicalProgressAtClaim: true } }),
      // Kurva aktual (b): biaya aktual kumulatif dari jurnal per bulan.
      this.prisma.journalLine.findMany({ where: { projectId: id, journal: { status: 'POSTED' } }, select: { debit: true, journal: { select: { createdAt: true } } } }),
    ]);

    // (a) progress fisik kumulatif per periode klaim
    const claimByPeriod = new Map<string, number>();
    for (const c of claims) {
      const period = c.period ?? 'unscheduled';
      claimByPeriod.set(period, (claimByPeriod.get(period) ?? 0) + Number(c.certifiedAmount ?? c.amount));
    }
    let claimCum = 0;
    const claimTotal = [...claimByPeriod.values()].reduce((s, v) => s + v, 0);
    const actualProgressCurve = [...claimByPeriod.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, value]) => {
        claimCum += value;
        return { period, value, cumulative: claimCum, pct: claimTotal > 0 ? Math.round((claimCum / claimTotal) * 1000) / 10 : 0 };
      });

    // (b) biaya aktual kumulatif per bulan
    const costByMonth = new Map<string, number>();
    for (const l of journalLines) {
      const month = l.journal.createdAt.toISOString().slice(0, 7);
      costByMonth.set(month, (costByMonth.get(month) ?? 0) + Number(l.debit));
    }
    let costCum = 0;
    const actualCostCurve = [...costByMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, value]) => {
        costCum += value;
        return { period, value, cumulative: costCum };
      });

    return {
      progressPlanned: Number(project.progressPlanned),
      progressActual: Number(project.progressActual),
      plannedCurve,
      actualProgressCurve,
      actualCostCurve,
      milestones: milestones.map((m) => ({
        id: m.id, name: m.name, plannedDate: m.plannedDate.toISOString(),
        actualDate: m.actualDate?.toISOString() ?? null, status: m.status, weight: Number(m.weight), isCritical: m.isCritical, notes: m.notes,
      })),
      phases: phases.map((p) => ({ phase: p.phase, enteredAt: p.enteredAt.toISOString(), exitedAt: p.exitedAt?.toISOString() ?? null, note: p.note })),
      gates: gates.map((g) => ({ id: g.id, gate: g.gate, phase: g.phase, decision: g.decision, decidedAt: g.decidedAt?.toISOString() ?? null, notes: g.notes })),
    };
  }

  /** Aliran kas utuh: Contract → Budget → Committed → Actual → Billed → Collected. */
  async cashFlow(id: string) {
    const s = await this.summary(id);
    const { contractValue, budget, committed, actual, billed, collected } = s.cost;
    return {
      projectId: id,
      chain: [
        { key: 'contract', label: 'Contract', value: contractValue },
        { key: 'budget', label: 'Budget', value: budget },
        { key: 'committed', label: 'Committed', value: committed },
        { key: 'actual', label: 'Actual', value: actual },
        { key: 'billed', label: 'Billed', value: billed },
        { key: 'collected', label: 'Collected', value: collected },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  async stakeholders(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    return this.prisma.projectStakeholder.findMany({ where: { projectId: id }, orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] });
  }

  async addStakeholder(id: string, dto: AddStakeholderDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    const row = await this.prisma.projectStakeholder.create({
      data: { projectId: id, name: dto.name, role: dto.role, raci: dto.raci ?? 'INFORMED', employeeId: dto.employeeId ?? null, email: dto.email ?? null, phone: dto.phone ?? null, isPrimary: dto.isPrimary ?? false },
    });
    await this.audit.record({ userId: actorId, action: 'PROJECT.STAKEHOLDER_ADD', resource: 'Project', resourceId: id, newValue: { name: dto.name, role: dto.role, raci: row.raci }, source: 'api' });
    await this.recordActivity(id, actorId, 'PROJECT.STAKEHOLDER_ADD', `${dto.name} added as ${dto.role}`);
    return row;
  }

  async removeStakeholder(id: string, stakeholderId: string, actorId: string) {
    const row = await this.prisma.projectStakeholder.findUnique({ where: { id: stakeholderId } });
    if (!row || row.projectId !== id) throw new NotFoundException({ code: 'STAKEHOLDER_NOT_FOUND', message: 'Stakeholder not found' });
    await this.prisma.projectStakeholder.delete({ where: { id: stakeholderId } });
    await this.audit.record({ userId: actorId, action: 'PROJECT.STAKEHOLDER_REMOVE', resource: 'Project', resourceId: id, oldValue: { name: row.name }, source: 'api' });
    return { id: stakeholderId, removed: true };
  }

  async milestones(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    return this.prisma.projectMilestone.findMany({ where: { projectId: id }, orderBy: { sortOrder: 'asc' } });
  }

  async createMilestone(id: string, dto: CreateMilestoneDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    const count = await this.prisma.projectMilestone.count({ where: { projectId: id } });
    const row = await this.prisma.projectMilestone.create({
      data: {
        projectId: id, name: dto.name, plannedDate: new Date(dto.plannedDate),
        actualDate: dto.actualDate ? new Date(dto.actualDate) : null,
        status: dto.status ?? 'PLANNED', weight: dto.weight ?? 0, isCritical: dto.isCritical ?? false,
        notes: dto.notes ?? null, sortOrder: count,
      },
    });
    await this.audit.record({ userId: actorId, action: 'PROJECT.MILESTONE_ADD', resource: 'Project', resourceId: id, newValue: { name: dto.name, plannedDate: dto.plannedDate }, source: 'api' });
    await this.recordActivity(id, actorId, 'PROJECT.MILESTONE_ADD', `Milestone "${dto.name}" added`);
    return row;
  }

  async updateMilestone(id: string, milestoneId: string, dto: UpdateMilestoneDto, actorId: string) {
    const row = await this.prisma.projectMilestone.findUnique({ where: { id: milestoneId } });
    if (!row || row.projectId !== id) throw new NotFoundException({ code: 'MILESTONE_NOT_FOUND', message: 'Milestone not found' });
    const data: Prisma.ProjectMilestoneUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.plannedDate !== undefined) data.plannedDate = new Date(dto.plannedDate);
    if (dto.actualDate !== undefined) data.actualDate = dto.actualDate ? new Date(dto.actualDate) : null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.weight !== undefined) data.weight = dto.weight;
    if (dto.isCritical !== undefined) data.isCritical = dto.isCritical;
    if (dto.notes !== undefined) data.notes = dto.notes || null;
    const updated = await this.prisma.projectMilestone.update({ where: { id: milestoneId }, data });
    await this.audit.record({ userId: actorId, action: 'PROJECT.MILESTONE_UPDATE', resource: 'Project', resourceId: id, newValue: data as Record<string, unknown>, source: 'api' });
    await this.recordActivity(id, actorId, 'PROJECT.MILESTONE_UPDATE', `Milestone "${updated.name}" updated`);
    return updated;
  }

  async deleteMilestone(id: string, milestoneId: string, actorId: string) {
    const row = await this.prisma.projectMilestone.findUnique({ where: { id: milestoneId } });
    if (!row || row.projectId !== id) throw new NotFoundException({ code: 'MILESTONE_NOT_FOUND', message: 'Milestone not found' });
    await this.prisma.projectMilestone.delete({ where: { id: milestoneId } });
    await this.audit.record({ userId: actorId, action: 'PROJECT.MILESTONE_DELETE', resource: 'Project', resourceId: id, oldValue: { name: row.name }, source: 'api' });
    return { id: milestoneId, deleted: true };
  }

  /** Riwayat fase proyek. */
  async phases(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, select: { id: true, phase: true } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    const history = await this.prisma.projectPhaseHistory.findMany({ where: { projectId: id }, orderBy: { enteredAt: 'asc' } });
    const gates = await this.prisma.stageGateReview.findMany({ where: { projectId: id }, orderBy: { decidedAt: 'asc' } });
    return { currentPhase: project.phase, history, gates };
  }

  /**
   * Majukan fase proyek (stage-gate). Menutup fase berjalan, membuka fase baru,
   * mencatat keputusan gate, dan memperbarui `Project.phase`.
   */
  async advancePhase(id: string, dto: AdvancePhaseDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    if (project.phase === dto.phase) throw new ConflictException({ code: 'PHASE_UNCHANGED', message: `Project is already in ${dto.phase}` });

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.projectPhaseHistory.updateMany({ where: { projectId: id, exitedAt: null }, data: { exitedAt: now } });
      await tx.projectPhaseHistory.create({ data: { projectId: id, phase: dto.phase, enteredAt: now, movedById: actorId, note: dto.notes ?? null } });
      await tx.stageGateReview.create({ data: { projectId: id, gate: dto.gate ?? `G-${dto.phase}`, phase: dto.phase, decision: dto.decision ?? 'GO', reviewerId: actorId, decidedAt: now, notes: dto.notes ?? null } });
      await tx.project.update({ where: { id }, data: { phase: dto.phase } });
    });

    await this.audit.record({ userId: actorId, action: 'PROJECT.PHASE_ADVANCE', resource: 'Project', resourceId: id, oldValue: { phase: project.phase }, newValue: { phase: dto.phase, decision: dto.decision ?? 'GO' }, source: 'api' });
    await this.recordActivity(id, actorId, 'PROJECT.PHASE_ADVANCE', `Phase ${project.phase} → ${dto.phase} (${dto.decision ?? 'GO'})`);
    return { id, from: project.phase, to: dto.phase, decision: dto.decision ?? 'GO' };
  }

  private async recordActivity(projectId: string, actorId: string | null, action: string, summary: string) {
    await this.prisma.projectActivity.create({ data: { projectId, actorId, action, summary } });
  }
}
