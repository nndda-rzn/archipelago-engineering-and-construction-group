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
      generatedAt: new Date().toISOString(),
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

    const milestones = await this.prisma.projectMilestone.findMany({ where: { projectId: id }, orderBy: { sortOrder: 'asc' } });
    const phases = await this.prisma.projectPhaseHistory.findMany({ where: { projectId: id }, orderBy: { enteredAt: 'asc' } });
    const gates = await this.prisma.stageGateReview.findMany({ where: { projectId: id }, orderBy: { decidedAt: 'asc' } });

    return {
      progressPlanned: Number(project.progressPlanned),
      progressActual: Number(project.progressActual),
      plannedCurve,
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
