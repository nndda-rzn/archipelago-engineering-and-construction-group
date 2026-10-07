import { PortfolioEvmCalculator } from './portfolio-evm.calculator';

function makeCalc(over: Partial<Record<string, unknown>> = {}) {
  const prisma = {
    budgetItem: { groupBy: async () => [{ projectId: 'p1', _sum: { amount: 1000 } }] },
    controlAccount: { groupBy: async () => [{ projectId: 'p1', _sum: { plannedValue: 600 } }] },
    workPackageProgress: { groupBy: async () => [{ workPackageId: 'w1', _max: { physicalProgress: 50 } }] },
    constructionWorkPackage: { findMany: async () => [{ id: 'w1', projectId: 'p1' }] },
    ...over,
  };
  const actualCost = { computeBatch: async () => new Map([['p1', 500]]) };
  return new PortfolioEvmCalculator(prisma as never, actualCost as never);
}

describe('PortfolioEvmCalculator', () => {
  it('computes CPI/SPI when a PV baseline exists', async () => {
    const m = await makeCalc().computeBatch(['p1']);
    const r = m.get('p1')!;
    expect(r.hasEvm).toBe(true);
    expect(r.ev).toBe(500);   // bac 1000 × progress 50%
    expect(r.cpi).toBe(1);    // 500/500
    expect(r.spi).toBe(0.8333); // 500/600
  });

  it('returns hasEvm=false and null ratios when pv = 0', async () => {
    const m = await makeCalc({ controlAccount: { groupBy: async () => [] } }).computeBatch(['p1']);
    const r = m.get('p1')!;
    expect(r.hasEvm).toBe(false);
    expect(r.cpi).toBeNull();
    expect(r.spi).toBeNull();
  });
});
