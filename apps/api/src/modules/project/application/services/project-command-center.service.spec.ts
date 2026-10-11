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
    purchaseOrder: { aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }), count: jest.fn().mockResolvedValue(0) },
    subcontract: { aggregate: jest.fn().mockResolvedValue({ _sum: { contractValue: 0 } }), count: jest.fn().mockResolvedValue(0) },
    progressClaim: { aggregate: jest.fn().mockResolvedValue({ _sum: { certifiedAmount: 0 } }) },
    clientInvoice: { aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }) },
    risk: { count: jest.fn().mockResolvedValue(0) },
    ncr: { count: jest.fn().mockResolvedValue(0) },
    hseIncident: { count: jest.fn().mockResolvedValue(0) },
    punchListItem: { count: jest.fn().mockResolvedValue(0) },
    purchaseRequisition: { count: jest.fn().mockResolvedValue(0) },
    vendorInvoice: { count: jest.fn().mockResolvedValue(0) },
    projectVariation: { count: jest.fn().mockResolvedValue(0) },
    constructionWorkPackage: { count: jest.fn().mockResolvedValue(0) },
    constructionDailyReport: { count: jest.fn().mockResolvedValue(0) },
    drawing: { count: jest.fn().mockResolvedValue(0) },
    deliverable: { count: jest.fn().mockResolvedValue(0) },
    contract: { count: jest.fn().mockResolvedValue(0) },
    projectMilestone: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    stageGateReview: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    projectPhaseHistory: { findMany: jest.fn().mockResolvedValue([]) },
    projectPeriodBudget: { findMany: jest.fn().mockResolvedValue([]) },
    projectActivity: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  } as never;
}

describe('ProjectCommandCenterService.summary', () => {
  it('assembles schedule, cost and cross-domain counts', async () => {
    const prisma = makePrisma({
      budgetItem: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1000 } }) },
      risk: { count: jest.fn().mockResolvedValue(2) },
      ncr: { count: jest.fn().mockResolvedValue(1) },
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
});

describe('ProjectCommandCenterService.cashFlow', () => {
  it('returns the six-step chain', async () => {
    const out = await makeService(makePrisma()).cashFlow('p1');
    expect(out.chain.map((c) => c.key)).toEqual(['contract', 'budget', 'committed', 'actual', 'billed', 'collected']);
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
