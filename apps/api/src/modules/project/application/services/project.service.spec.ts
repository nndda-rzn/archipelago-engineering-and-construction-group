import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { PROJECT_SORT_FIELDS } from '@aec/api-contracts';

/** Prisma palsu: cukup untuk `register()` (project.findMany + budgetItem.groupBy + tim). */
function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    project: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'p1', code: 'PRJ-01', name: 'Alpha', client: 'C1', manager: 'Andi', status: 'ACTIVE',
          contractValue: 100, startDate: new Date('2026-01-01'), completionDate: new Date('2027-01-01'), createdAt: new Date('2026-01-01'),
          type: 'EPC', priority: 'HIGH',
          managerRef: { id: 'e1', name: 'Andi Pratama', position: 'Project Manager' }, directorRef: null,
          _count: { assignments: 2 },
        },
        {
          id: 'p2', code: 'PRJ-02', name: 'Beta', client: 'C2', manager: null, status: 'PLANNING',
          contractValue: 50, startDate: null, completionDate: null, createdAt: new Date('2026-02-01'),
          type: 'OTHER', priority: 'MEDIUM', managerRef: null, directorRef: null, _count: { assignments: 0 },
        },
      ]),
    },
    budgetItem: { groupBy: jest.fn().mockResolvedValue([{ projectId: 'p1', _sum: { amount: 80 } }]) },
    stockLedgerEntry: { groupBy: jest.fn().mockResolvedValue([{ projectId: 'p1', _sum: { totalValue: -60 } }]) },
    vendorInvoice: { findMany: jest.fn().mockResolvedValue([]) },
    journal: { findMany: jest.fn().mockResolvedValue([]) },
    projectAssignment: {
      findMany: jest.fn().mockResolvedValue([
        { projectId: 'p1', isKeyMember: true, employee: { id: 'e1', name: 'Andi Pratama', position: 'Project Manager' } },
        { projectId: 'p1', isKeyMember: false, employee: { id: 'e2', name: 'Dewi Lestari', position: 'Site Engineer' } },
      ]),
    },
    projectActivity: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  } as never;
}

const cache = {
  wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn(),
  invalidate: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
} as never;
const audit = { record: jest.fn() } as never;

/** ActualCostCalculator palsu: hitung dari ledger OUT + invoice journal. */
function makeActualCost(perProject: Record<string, number> = { p1: 60 }) {
  return { computeBatch: jest.fn(async (ids: string[]) => new Map(ids.map((id) => [id, perProject[id] ?? 0]))) } as never;
}

/** Service untuk test tim/stats (mock minimal + projectActivity default). */
function makeService(prisma: unknown, auditStub: unknown = { record: jest.fn() }) {
  const p = prisma as { projectActivity?: { create: jest.Mock } };
  if (!p.projectActivity) p.projectActivity = { create: jest.fn().mockResolvedValue({}) };
  return new ProjectService(prisma as never, auditStub as never, cache, makeActualCost());
}

describe('ProjectService.register', () => {
  it('returns one payload with project metadata + budget/actual/health for every project', async () => {
    const svc = new ProjectService(makePrisma(), audit, cache, makeActualCost());
    const result = await svc.register();

    expect(result.items).toHaveLength(2);
    const a = result.items.find((i) => i.code === 'PRJ-01')!;
    expect(a.budget).toBe(80);
    expect(a.actual).toBe(60);
    expect(a.variance).toBe(20);
    expect(a.utilization).toBe(75);
    expect(a.health).toBe('AT_RISK');
    expect(a.manager).toBe('Andi');
    expect(a.startDate).toBe('2026-01-01T00:00:00.000Z');
  });

  it('includes type, priority, the manager as a person, and the team', async () => {
    const svc = new ProjectService(makePrisma(), audit, cache, makeActualCost());
    const result = await svc.register();
    const a = result.items.find((i) => i.code === 'PRJ-01')!;
    expect(a.type).toBe('EPC');
    expect(a.priority).toBe('HIGH');
    expect(a.managerRef?.name).toBe('Andi Pratama');
    expect(a.teamCount).toBe(2);
    expect(a.team[0]!.name).toBe('Andi Pratama');
    expect(a.team[0]!.isKeyMember).toBe(true);
  });

  it('marks a project with no published budget as NO_BUDGET with null utilization', async () => {
    const svc = new ProjectService(makePrisma(), audit, cache, makeActualCost());
    const result = await svc.register();
    const b = result.items.find((i) => i.code === 'PRJ-02')!;
    expect(b.budget).toBe(0);
    expect(b.utilization).toBeNull();
    expect(b.health).toBe('NO_BUDGET');
  });

  it('returns dates as null (not undefined) when the project has none', async () => {
    const svc = new ProjectService(makePrisma(), audit, cache, makeActualCost());
    const result = await svc.register();
    const b = result.items.find((i) => i.code === 'PRJ-02')!;
    expect(b.startDate).toBeNull();
    expect(b.completionDate).toBeNull();
  });

  it('aggregates totals and health counts', async () => {
    const svc = new ProjectService(makePrisma(), audit, cache, makeActualCost());
    const result = await svc.register();
    expect(result.totals.projectCount).toBe(2);
    expect(result.totals.totalContract).toBe(150);
    expect(result.totals.totalBudget).toBe(80);
    expect(result.totals.totalActual).toBe(60);
    expect(result.totals.totalVariance).toBe(20);
    expect(result.healthCounts.AT_RISK).toBe(1);
    expect(result.healthCounts.NO_BUDGET).toBe(1);
  });

  it('sorts server-side using a whitelisted column', async () => {
    const prisma = makePrisma();
    const svc = new ProjectService(prisma, audit, cache, makeActualCost());
    await svc.register({ sort: 'contractValue', order: 'asc' });
    const findMany = (prisma as unknown as { project: { findMany: jest.Mock } }).project.findMany;
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { contractValue: 'asc' } }));
  });

  it('falls back to createdAt desc for an unknown sort column (no crash, no injection)', async () => {
    const prisma = makePrisma();
    const svc = new ProjectService(prisma, audit, cache, makeActualCost());
    await svc.register({ sort: 'passwordHash' as never });
    const findMany = (prisma as unknown as { project: { findMany: jest.Mock } }).project.findMany;
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { createdAt: 'desc' } }));
  });

  it('exposes the whitelist used for sorting', () => {
    expect(PROJECT_SORT_FIELDS).toContain('contractValue');
    expect(PROJECT_SORT_FIELDS).not.toContain('legalEntityId');
  });
});

describe('ProjectService.update', () => {
  function makeUpdatePrisma() {
    return {
      project: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', code: 'PRJ-01', name: 'Alpha', status: 'ACTIVE' }),
        update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'p1', ...data })),
      },
      projectActivity: { create: jest.fn().mockResolvedValue({}) },
    } as never;
  }

  it('updates editable metadata and records an audit entry', async () => {
    const prisma = makeUpdatePrisma();
    const record = jest.fn();
    const svc = new ProjectService(prisma, { record } as never, cache, makeActualCost());

    await svc.update('p1', { name: 'Alpha v2', manager: 'Budi' }, 'user-1');

    const update = (prisma as unknown as { project: { update: jest.Mock } }).project.update;
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p1' }, data: expect.objectContaining({ name: 'Alpha v2', manager: 'Budi' }) }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PROJECT.UPDATE', resourceId: 'p1' }));
  });

  it('rejects an unknown project with 404', async () => {
    const prisma = { project: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() }, projectActivity: { create: jest.fn() } } as never;
    const svc = new ProjectService(prisma, { record: jest.fn() } as never, cache, makeActualCost());
    await expect(svc.update('nope', { name: 'X' }, 'u')).rejects.toThrow(/not found/i);
  });

  it('converts date strings to Date and empty strings to null', async () => {
    const prisma = makeUpdatePrisma();
    const svc = new ProjectService(prisma, { record: jest.fn() } as never, cache, makeActualCost());
    await svc.update('p1', { startDate: '2026-03-01', completionDate: '' }, 'u');
    const update = (prisma as unknown as { project: { update: jest.Mock } }).project.update;
    const data = update.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data.startDate).toBeInstanceOf(Date);
    expect(data.completionDate).toBeNull();
  });

  it('rejects a status outside the allowed set', async () => {
    const prisma = makeUpdatePrisma();
    const svc = new ProjectService(prisma, { record: jest.fn() } as never, cache, makeActualCost());
    // Tipe sudah melarang ini; diuji di runtime untuk memastikan API juga menolak.
    await expect(svc.update('p1', { status: 'BOGUS' as never }, 'u')).rejects.toThrow(/status/i);
  });

  it('ignores fields that are not editable (code, legalEntityId)', async () => {
    const prisma = makeUpdatePrisma();
    const svc = new ProjectService(prisma, { record: jest.fn() } as never, cache, makeActualCost());
    await svc.update('p1', { code: 'HACKED', legalEntityId: 'other' } as never, 'u');
    const update = (prisma as unknown as { project: { update: jest.Mock } }).project.update;
    const data = update.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data.code).toBeUndefined();
    expect(data.legalEntityId).toBeUndefined();
  });
});

describe('ProjectService.stats', () => {
  it('returns lifecycle counts plus projects without a team', async () => {
    const prisma = {
      project: {
        count: jest.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(8).mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(2),
        findMany: jest.fn().mockResolvedValue([
          { contractValue: 1000, _count: { assignments: 3 } },
          { contractValue: 2000, _count: { assignments: 0 } },
        ]),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;

    const out = await makeService(prisma).stats();
    expect(out.total).toBe(12);
    expect(out.active).toBe(8);
    expect(out.onHold).toBe(1);
    expect(out.completed).toBe(1);
    expect(out.critical).toBe(2);
    expect(out.withoutTeam).toBe(1);
    expect(out.totalContract).toBe(3000);
  });
});

describe('ProjectService.team', () => {
  it('lists members with allocation totals', async () => {
    const prisma = {
      project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      projectAssignment: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'a1', role: 'Project Manager', allocationPercent: 60, startDate: new Date('2026-01-01'), endDate: null, isKeyMember: true, status: 'ACTIVE', employee: { id: 'e1', name: 'Ahmad Fauzi', position: 'Project Manager', department: 'Construction', grade: 'L3', employeeNumber: 'EMP-000003' } },
          { id: 'a2', role: 'Site Engineer', allocationPercent: 40, startDate: new Date('2026-02-01'), endDate: null, isKeyMember: false, status: 'ACTIVE', employee: { id: 'e2', name: 'Dewi Lestari', position: 'Site Engineer', department: 'Engineering', grade: 'L2', employeeNumber: 'EMP-000004' } },
        ]),
      },
    } as never;

    const out = await makeService(prisma).team('p1');
    expect(out.total).toBe(2);
    expect(out.totalAllocation).toBe(100);
    expect(out.items[0]!.name).toBe('Ahmad Fauzi');
    expect(out.items[0]!.isKeyMember).toBe(true);
  });

  it('throws NotFound for a missing project', async () => {
    const prisma = { project: { findUnique: jest.fn().mockResolvedValue(null) } } as never;
    await expect(makeService(prisma).team('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProjectService.addMember / removeMember', () => {
  it('assigns an employee and audits', async () => {
    const auditStub = { record: jest.fn() };
    const prisma = {
      project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      employee: { findUnique: jest.fn().mockResolvedValue({ id: 'e1', name: 'Dewi Lestari' }) },
      projectAssignment: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'a1' }) },
    } as never;

    await makeService(prisma, auditStub).addMember('p1', { employeeId: 'e1', allocationPercent: 50, role: 'Site Engineer' }, 'actor');
    expect(auditStub.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PROJECT.MEMBER_ADD' }));
  });

  it('rejects adding an employee already on the project', async () => {
    const prisma = {
      project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      employee: { findUnique: jest.fn().mockResolvedValue({ id: 'e1', name: 'Dewi' }) },
      projectAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 'a1' }) },
    } as never;
    await expect(makeService(prisma).addMember('p1', { employeeId: 'e1', allocationPercent: 50 }, 'actor')).rejects.toBeInstanceOf(ConflictException);
  });

  it('removes a member by ending the assignment', async () => {
    const auditStub = { record: jest.fn() };
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      projectAssignment: { findUnique: jest.fn().mockResolvedValue({ id: 'a1', projectId: 'p1', status: 'ACTIVE', employeeId: 'e1', employee: { name: 'Dewi' } }), update },
    } as never;

    await makeService(prisma, auditStub).removeMember('p1', 'a1', 'actor');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ENDED' }) }));
    expect(auditStub.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PROJECT.MEMBER_REMOVE' }));
  });
});

describe('ProjectService.updateMeta', () => {
  it('updates type/priority and audits', async () => {
    const auditStub = { record: jest.fn() };
    const prisma = {
      project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', type: 'OTHER', priority: 'MEDIUM' }), update: jest.fn().mockResolvedValue({ id: 'p1', type: 'POWER', priority: 'CRITICAL' }) },
    } as never;

    await makeService(prisma, auditStub).updateMeta('p1', { type: 'POWER', priority: 'CRITICAL' }, 'actor');
    expect(auditStub.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PROJECT.UPDATE' }));
  });
});
