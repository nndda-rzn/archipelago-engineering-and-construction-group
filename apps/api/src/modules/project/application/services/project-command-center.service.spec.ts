import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectCommandCenterService } from './project-command-center.service';

function makeService(prisma: unknown, audit: unknown = { record: jest.fn() }) {
  const p = prisma as { projectActivity?: { create: jest.Mock } };
  if (!p.projectActivity) p.projectActivity = { create: jest.fn().mockResolvedValue({}) };
  const actualCost = { compute: jest.fn().mockResolvedValue(500), computeBatch: jest.fn().mockResolvedValue(new Map()) } as never;
  return new ProjectCommandCenterService(prisma as never, audit as never, actualCost);
}

const baseProject = {
  id: 'p1', code: 'PRJ-01', name: 'Alpha', client: 'PT Klien', status: 'ACTIVE', phase: 'CONSTRUCTION',
  healthStatus: 'AT_RISK', type: 'EPC', priority: 'HIGH', currency: 'IDR', location: 'Karawang',
  contractValue: 1000, progressPlanned: 55, progressActual: 48,
  startDate: new Date('2026-01-01'), completionDate: new Date('2027-01-01'),
  legalEntity: { code: 'AEC-CON', legalName: 'PT AEC' },
  managerRef: { id: 'e1', name: 'Ahmad', position: 'PM' }, directorRef: null,
};

/** Semua agregat/count default 0; override sesuai test. */
function makePrisma(overrides: Record<string, unknown> = {}) {
  const agg = { _sum: { amount: 0 } };
  return {
    project: { findUnique: jest.fn().mockResolvedValue(baseProject) },
    budgetItem: { aggregate: jest.fn().mockResolvedValue(agg) },
    progressClaim: { aggregate: jest.fn().mockResolvedValue({ _sum: { certifiedAmount: 0 } }), findMany: jest.fn().mockResolvedValue([]) },
    clientInvoice: { aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }), count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    risk: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    ncr: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    hseIncident: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    punchListItem: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    purchaseRequisition: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    vendorInvoice: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    projectVariation: { count: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue({ _sum: { amountChange: 0 } }), findMany: jest.fn().mockResolvedValue([]) },
    purchaseOrder: { aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }), count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    subcontract: { aggregate: jest.fn().mockResolvedValue({ _sum: { contractValue: 0 } }), count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    constructionWorkPackage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    controlAccount: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null), update: jest.fn(), create: jest.fn() },
    constructionDailyReport: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    drawing: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    deliverable: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    contract: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    safetyObservation: { findMany: jest.fn().mockResolvedValue([]) },
    permitToWork: { findMany: jest.fn().mockResolvedValue([]) },
    legalCase: { findMany: jest.fn().mockResolvedValue([]) },
    projectMilestone: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    stageGateReview: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    projectPhaseHistory: { findMany: jest.fn().mockResolvedValue([]) },
    projectPeriodBudget: { findMany: jest.fn().mockResolvedValue([]) },
    journalLine: { findMany: jest.fn().mockResolvedValue([]) },
    collectionItem: { findMany: jest.fn().mockResolvedValue([]) },
    projectActivity: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  } as never;
}

describe('ProjectCommandCenterService.summary', () => {
  it('assembles schedule, cost and cross-domain counts', async () => {
    const prisma = makePrisma({
      budgetItem: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1000 } }) },
      risk: { count: jest.fn().mockResolvedValue(2), groupBy: jest.fn().mockResolvedValue([]) },
      ncr: { count: jest.fn().mockResolvedValue(1), groupBy: jest.fn().mockResolvedValue([]) },
      projectMilestone: { count: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(4).mockResolvedValueOnce(1), findMany: jest.fn() },
    });
    const out = await makeService(prisma).summary('p1');
    expect(out.project.phase).toBe('CONSTRUCTION');
    expect(out.schedule.progressActual).toBe(48);
    expect(out.schedule.variance).toBe(-7);
    expect(out.cost.actual).toBe(500);
    expect(out.domains.governance.riskOpen).toBe(2);
    expect(out.domains.quality.ncrOpen).toBe(1);
    expect(out.signals.find((s) => s.key === 'schedule')!.tone).toBe('warn');
  });

  it('throws NotFound for a missing project', async () => {
    const prisma = makePrisma({ project: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(makeService(prisma).summary('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('includes a risk matrix and category mixes for the visuals', async () => {
    const prisma = makePrisma({
      risk: { count: jest.fn().mockResolvedValue(3), groupBy: jest.fn().mockResolvedValue([{ likelihood: 4, impact: 4, _count: { _all: 2 } }]) },
      ncr: { count: jest.fn().mockResolvedValue(1), groupBy: jest.fn().mockResolvedValue([{ severity: 'MAJOR', _count: { _all: 1 } }]) },
      hseIncident: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([{ severity: 'LOW', _count: { _all: 1 } }]) },
    });
    const out = await makeService(prisma).summary('p1');
    expect(out.analytics.riskMatrix[0]).toEqual({ likelihood: 4, impact: 4, count: 2 });
    expect(out.analytics.qualityMix[0]).toEqual({ key: 'MAJOR', count: 1 });
    expect(out.analytics.billing).toHaveProperty('certified');
  });
});

describe('ProjectCommandCenterService.schedule', () => {
  it('builds a cumulative planned curve and lists milestones/phases/gates', async () => {
    const prisma = makePrisma({
      project: { findUnique: jest.fn().mockResolvedValue({ progressPlanned: 55, progressActual: 48, startDate: new Date() }) },
      projectPeriodBudget: { findMany: jest.fn().mockResolvedValue([
        { period: '2026-Q1', plannedCost: 100 },
        { period: '2026-Q2', plannedCost: 300 },
      ]) },
      projectMilestone: { findMany: jest.fn().mockResolvedValue([{ id: 'm1', name: 'Design Freeze', plannedDate: new Date('2026-03-01'), actualDate: null, status: 'PLANNED', weight: 20, isCritical: true, notes: null }]), count: jest.fn() },
      projectPhaseHistory: { findMany: jest.fn().mockResolvedValue([{ phase: 'INITIATION', enteredAt: new Date('2026-01-01'), exitedAt: null, note: null }]) },
      stageGateReview: { findMany: jest.fn().mockResolvedValue([{ id: 'g1', gate: 'G1', phase: 'FEED', decision: 'GO', decidedAt: new Date('2026-03-01'), notes: null }]), count: jest.fn() },
    });
    const out = await makeService(prisma).schedule('p1');
    expect(out.plannedCurve).toHaveLength(2);
    expect(out.plannedCurve[1]!.plannedCumulative).toBe(400);
    expect(out.plannedCurve[1]!.plannedPct).toBe(100);
    expect(out.milestones[0]!.name).toBe('Design Freeze');
    expect(out.gates[0]!.decision).toBe('GO');
  });

  it('derives an actual progress curve from certified claims and an actual cost curve from journals', async () => {
    const prisma = makePrisma({
      project: { findUnique: jest.fn().mockResolvedValue({ progressPlanned: 55, progressActual: 48, startDate: new Date() }) },
      progressClaim: { findMany: jest.fn().mockResolvedValue([
        { period: '2026-01', certifiedAmount: 100, amount: 100, physicalProgressAtClaim: null },
        { period: '2026-02', certifiedAmount: 300, amount: 300, physicalProgressAtClaim: null },
      ]), aggregate: jest.fn() },
      journalLine: { findMany: jest.fn().mockResolvedValue([
        { debit: 50, journal: { createdAt: new Date('2026-01-15') } },
        { debit: 150, journal: { createdAt: new Date('2026-02-15') } },
      ]) },
    });
    const out = await makeService(prisma).schedule('p1');
    expect(out.actualProgressCurve).toHaveLength(2);
    expect(out.actualProgressCurve[1]!.cumulative).toBe(400);
    expect(out.actualProgressCurve[1]!.pct).toBe(100);
    expect(out.actualCostCurve).toHaveLength(2);
    expect(out.actualCostCurve[1]!.cumulative).toBe(200);
  });
});

describe('ProjectCommandCenterService.cashFlow', () => {
  it('returns the six-step chain', async () => {
    const out = await makeService(makePrisma()).cashFlow('p1');
    expect(out.chain.map((c) => c.key)).toEqual(['contract', 'budget', 'committed', 'actual', 'billed', 'collected']);
  });
});

describe('ProjectCommandCenterService.gantt', () => {
  it('assembles scheduled rows from phases, milestones, control accounts and work packages', async () => {
    const prisma = makePrisma({
      project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', startDate: new Date('2026-01-01'), completionDate: new Date('2027-01-01') }) },
      projectPhaseHistory: { findMany: jest.fn().mockResolvedValue([{ id: 'ph1', phase: 'CONSTRUCTION', enteredAt: new Date('2026-03-01'), exitedAt: null }]) },
      projectMilestone: { count: jest.fn(), findMany: jest.fn().mockResolvedValue([{ id: 'm1', name: 'Handover', plannedDate: new Date('2027-01-01'), actualDate: null, status: 'PLANNED', isCritical: true }]) },
      controlAccount: { findMany: jest.fn().mockResolvedValue([{ id: 'ca1', name: 'Engineering', scheduleStart: new Date('2026-01-01'), scheduleEnd: new Date('2026-03-01'), progressPercent: 100, isCriticalPath: true, baselineStart: new Date('2026-01-01'), baselineEnd: new Date('2026-02-20'), predecessorId: null, dependencyType: 'FS', lagDays: 0, status: 'ACTIVE' }, { id: 'ca2', name: 'Construction', scheduleStart: new Date('2026-03-01'), scheduleEnd: new Date('2026-08-01'), progressPercent: 40, isCriticalPath: false, baselineStart: null, baselineEnd: null, predecessorId: 'ca1', dependencyType: 'FS', lagDays: 0, status: 'ACTIVE' }]) },
      constructionWorkPackage: { findMany: jest.fn().mockResolvedValue([{ id: 'wp1', wpNumber: 'WP-1', title: 'Erection', startDate: new Date('2026-03-01'), endDate: new Date('2026-08-01'), baselineStart: null, baselineEnd: null, predecessorId: null, isCriticalPath: true, status: 'IN_PROGRESS', progress: [{ physicalProgress: 45 }] }]) },
    });
    const out = await makeService(prisma).gantt('p1');
    expect(out.rows.length).toBeGreaterThanOrEqual(5);
    expect(out.rows.find((r) => r.id === 'ca-ca2')).toBeTruthy();
    expect(out.rows.find((r) => r.milestone === true)!.label).toBe('Handover');
    expect(out.links).toContainEqual({ from: 'ca-ca1', to: 'ca-ca2', type: 'FS', lagDays: 0 });
  });

  it('throws NotFound for a missing project', async () => {
    const prisma = makePrisma({ project: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(makeService(prisma).gantt('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProjectCommandCenterService.domains', () => {
  it('returns per-domain short lists', async () => {
    const prisma = makePrisma({
      project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      constructionWorkPackage: { findMany: jest.fn().mockResolvedValue([{ id: 'w1', wpNumber: 'WP-1', title: 'Erection', status: 'IN_PROGRESS', progress: [] }]), count: jest.fn().mockResolvedValue(1) },
      ncr: { findMany: jest.fn().mockResolvedValue([{ id: 'n1', ncrNumber: 'NCR-1', description: 'Weld defect', severity: 'MAJOR', status: 'OPEN' }]), count: jest.fn().mockResolvedValue(1) },
      risk: { findMany: jest.fn().mockResolvedValue([{ id: 'r1', riskNumber: 'RSK-1', title: 'Delay', category: 'SCHEDULE', likelihood: 4, impact: 4, score: 16, status: 'OPEN' }]), count: jest.fn().mockResolvedValue(1) },
    });
    const out = await makeService(prisma).domains('p1');
    expect(out.execution.workPackages[0]!.ref).toBe('WP-1');
    expect(out.quality.ncrs[0]!.severity).toBe('MAJOR');
    expect(out.governance.risks[0]!.score).toBe(16);
  });

  it('throws NotFound for a missing project', async () => {
    const prisma = makePrisma({ project: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(makeService(prisma).domains('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProjectCommandCenterService.advancePhase', () => {
  it('moves the project to a new phase, records history and a gate', async () => {
    const audit = { record: jest.fn() };
    const tx = {
      projectPhaseHistory: { updateMany: jest.fn(), create: jest.fn() },
      stageGateReview: { create: jest.fn() },
      project: { update: jest.fn() },
    };
    const prisma = makePrisma({
      project: { findUnique: jest.fn().mockResolvedValue({ ...baseProject, phase: 'ENGINEERING' }) },
      $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)),
    });
    const out = await makeService(prisma, audit).advancePhase('p1', { phase: 'PROCUREMENT', decision: 'GO' }, 'actor');
    expect(out.from).toBe('ENGINEERING');
    expect(out.to).toBe('PROCUREMENT');
    expect(tx.projectPhaseHistory.updateMany).toHaveBeenCalled();
    expect(tx.stageGateReview.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PROJECT.PHASE_ADVANCE' }));
  });

  it('rejects advancing to the current phase', async () => {
    const prisma = makePrisma({ project: { findUnique: jest.fn().mockResolvedValue({ ...baseProject, phase: 'CONSTRUCTION' }) } });
    await expect(makeService(prisma).advancePhase('p1', { phase: 'CONSTRUCTION' }, 'actor')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ProjectCommandCenterService.milestones', () => {
  it('creates a milestone and audits', async () => {
    const audit = { record: jest.fn() };
    const create = jest.fn().mockResolvedValue({ id: 'm1' });
    const prisma = makePrisma({
      project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      projectMilestone: { count: jest.fn().mockResolvedValue(0), create, findMany: jest.fn() },
    });
    await makeService(prisma, audit).createMilestone('p1', { name: 'Handover', plannedDate: '2027-01-01', isCritical: true }, 'actor');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: 'Handover', isCritical: true }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PROJECT.MILESTONE_ADD' }));
  });
});

describe('ProjectCommandCenterService.stakeholders', () => {
  it('adds a stakeholder and audits', async () => {
    const audit = { record: jest.fn() };
    const create = jest.fn().mockResolvedValue({ id: 's1', raci: 'ACCOUNTABLE' });
    const prisma = makePrisma({
      project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      projectStakeholder: { create, findMany: jest.fn() },
    });
    await makeService(prisma, audit).addStakeholder('p1', { name: 'Budi', role: 'Sponsor', raci: 'ACCOUNTABLE' }, 'actor');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: 'Budi', raci: 'ACCOUNTABLE' }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PROJECT.STAKEHOLDER_ADD' }));
  });
});
