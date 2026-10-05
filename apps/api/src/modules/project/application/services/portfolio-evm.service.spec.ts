import { PortfolioEvmService } from './portfolio-evm.service';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    project: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'p1', code: 'PRJ-1', name: 'One' },
        { id: 'p2', code: 'PRJ-2', name: 'Two' },
      ]),
    },
    controlAccount: { groupBy: jest.fn().mockResolvedValue([]) },
    budgetItem: { groupBy: jest.fn().mockResolvedValue([{ projectId: 'p1', _sum: { amount: 100 } }]) },
    workPackageProgress: { groupBy: jest.fn().mockResolvedValue([]) },
    constructionWorkPackage: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as never;
}

describe('PortfolioEvmService', () => {
  it('marks a project with PV=0 as hasEvm:false and does not produce Infinity', async () => {
    const prisma = makePrisma({ controlAccount: { groupBy: jest.fn().mockResolvedValue([]) } });
    const actualCost = { computeBatch: jest.fn().mockResolvedValue(new Map([['p1', 40], ['p2', 0]])) } as never;
    const svc = new PortfolioEvmService(prisma, actualCost);

    const result = await svc.portfolioEvm();
    const p1 = result.items.find((i) => i.projectId === 'p1')!;

    expect(p1.hasEvm).toBe(false);
    expect(p1.cpi).toBeNull();
    expect(p1.spi).toBeNull();
    expect(p1.tcpi).toBeNull();
    expect(Number.isFinite(p1.eac)).toBe(true);
    expect(p1.eac).toBe(100); // falls back to BAC
  });

  it('computes cpi/eac/vac/tcpi when a planned-value baseline exists', async () => {
    const prisma = makePrisma({
      controlAccount: { groupBy: jest.fn().mockResolvedValue([{ projectId: 'p1', _sum: { plannedValue: 60 } }]) },
    });
    const actualCost = { computeBatch: jest.fn().mockResolvedValue(new Map([['p1', 40], ['p2', 0]])) } as never;
    const svc = new PortfolioEvmService(prisma, actualCost);

    const result = await svc.portfolioEvm();
    const p1 = result.items.find((i) => i.projectId === 'p1')!;

    // BAC=100, progress=0 → EV=0, AC=40 → cpi = 0/40 = 0
    expect(p1.hasEvm).toBe(true);
    expect(p1.cpi).toBe(0);
    expect(p1.eac).toBe(100); // cpi <= 0 → fallback BAC
    expect(p1.tcpi).toBeCloseTo(1.67, 2); // (BAC-EV)/(BAC-AC) = 100/60
  });

  it('scopes projects by legalEntityId when provided', async () => {
    const prisma = makePrisma();
    const actualCost = { computeBatch: jest.fn().mockResolvedValue(new Map()) } as never;
    const svc = new PortfolioEvmService(prisma, actualCost);
    await svc.portfolioEvm({ legalEntityId: 'LE1' });
    expect((prisma as { project: { findMany: jest.Mock } }).project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { legalEntityId: 'LE1' } }),
    );
  });
});
