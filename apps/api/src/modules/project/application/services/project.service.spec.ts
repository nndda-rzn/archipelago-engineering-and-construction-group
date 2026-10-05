import { ProjectService } from './project.service';
import { PROJECT_SORT_FIELDS } from '@aec/api-contracts';

/** Prisma palsu: cukup untuk `register()` (project.findMany + budgetItem.groupBy). */
function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    project: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'p1', code: 'PRJ-01', name: 'Alpha', client: 'C1', manager: 'Andi', status: 'ACTIVE', contractValue: 100, startDate: new Date('2026-01-01'), completionDate: new Date('2027-01-01'), createdAt: new Date('2026-01-01') },
        { id: 'p2', code: 'PRJ-02', name: 'Beta', client: 'C2', manager: null, status: 'PLANNING', contractValue: 50, startDate: null, completionDate: null, createdAt: new Date('2026-02-01') },
      ]),
    },
    budgetItem: { groupBy: jest.fn().mockResolvedValue([{ projectId: 'p1', _sum: { amount: 80 } }]) },
    stockLedgerEntry: { groupBy: jest.fn().mockResolvedValue([{ projectId: 'p1', _sum: { totalValue: -60 } }]) },
    vendorInvoice: { findMany: jest.fn().mockResolvedValue([]) },
    journal: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as never;
}

const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn(), invalidate: jest.fn() } as never;
const audit = { record: jest.fn() } as never;

/** ActualCostCalculator palsu: hitung dari ledger OUT + invoice journal. */
function makeActualCost(perProject: Record<string, number> = { p1: 60 }) {
  return { computeBatch: jest.fn(async (ids: string[]) => new Map(ids.map((id) => [id, perProject[id] ?? 0]))) } as never;
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
