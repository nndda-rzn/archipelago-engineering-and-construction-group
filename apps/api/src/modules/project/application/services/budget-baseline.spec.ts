import { buildStatementRows, sumTotals, type StatementInput } from './budget-baseline';

const wbs = (id: string, code: string, parentId: string | null = null) => ({ id, code, name: `n${id}`, parentId });

const input = (over: Partial<StatementInput> = {}): StatementInput => ({
  wbs: [wbs('p', '1'), wbs('c1', '1.1', 'p'), wbs('c2', '1.2', 'p')],
  baseline: [],
  revised: [],
  committed: [],
  actual: [],
  pvByWbs: new Map(),
  ...over,
});

describe('buildStatementRows', () => {
  it('rolls baseline, revised, committed and actual up to the parent', () => {
    const rows = buildStatementRows(input({
      baseline: [
        { wbsItemId: 'c1', costType: 'LABOR', amount: 100 },
        { wbsItemId: 'c2', costType: 'MATERIAL', amount: 300 },
      ],
      revised: [
        { wbsItemId: 'c1', costType: 'LABOR', amount: 120 },
        { wbsItemId: 'c2', costType: 'MATERIAL', amount: 300 },
      ],
      committed: [{ wbsItemId: 'c2', amount: 200 }],
      actual: [{ wbsItemId: 'c1', amount: 40 }],
    }));
    const parent = rows.find((r) => r.id === 'p')!;
    expect(parent.baseline).toBe(400);
    expect(parent.revised).toBe(420);
    expect(parent.committed).toBe(200);
    expect(parent.actual).toBe(40);
  });

  it('computes available and variance after rollup, not by summing children', () => {
    const rows = buildStatementRows(input({
      revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }],
      committed: [{ wbsItemId: 'c1', amount: 30 }],
      actual: [{ wbsItemId: 'c1', amount: 50 }],
    }));
    const parent = rows.find((r) => r.id === 'p')!;
    // available = revised - committed - actual = 100 - 30 - 50
    expect(parent.available).toBe(20);
    expect(parent.variance).toBe(50);
  });

  it('keeps a negative variance negative instead of clamping to zero', () => {
    const rows = buildStatementRows(input({
      revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }],
      actual: [{ wbsItemId: 'c1', amount: 150 }],
    }));
    expect(rows.find((r) => r.id === 'c1')!.variance).toBe(-50);
  });

  it('sets varianceBaseline to revised minus baseline', () => {
    const rows = buildStatementRows(input({
      baseline: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }],
      revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 130 }],
    }));
    expect(rows.find((r) => r.id === 'c1')!.varianceBaseline).toBe(30);
  });

  it('emits rows in pre-order with depth, so the table can render hierarchy', () => {
    const rows = buildStatementRows(input());
    expect(rows.map((r) => [r.code, r.depth])).toEqual([['1', 0], ['1.1', 1], ['1.2', 1]]);
  });

  it('skips spend whose WBS no longer exists instead of throwing', () => {
    const rows = buildStatementRows(input({
      actual: [{ wbsItemId: 'deleted', amount: 999 }],
    }));
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.actual === 0)).toBe(true);
  });

  it('rolls byCostType across the subtree', () => {
    const rows = buildStatementRows(input({
      revised: [
        { wbsItemId: 'c1', costType: 'LABOR', amount: 100 },
        { wbsItemId: 'c2', costType: 'MATERIAL', amount: 300 },
      ],
    }));
    expect(rows.find((r) => r.id === 'p')!.byCostType).toEqual({ LABOR: 100, MATERIAL: 300 });
  });

  it('treats an orphan as a root so no row disappears', () => {
    const rows = buildStatementRows(input({ wbs: [wbs('x', '9', 'missing')] }));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.depth).toBe(0);
  });

  it('does not hang on a parent cycle', () => {
    const rows = buildStatementRows(input({ wbs: [wbs('a', '1', 'b'), wbs('b', '2', 'a')] }));
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.every((r) => r.depth === 0)).toBe(true);
  });

  it('orders siblings naturally: 1 < 1.1 < 2 < 10', () => {
    const rows = buildStatementRows(input({
      wbs: [wbs('x', '10'), wbs('y', '2'), wbs('z', '1')],
    }));
    expect(rows.map((r) => r.code)).toEqual(['1', '2', '10']);
  });

  it('reports zero rather than NaN when a node has no money at all', () => {
    const rows = buildStatementRows(input({ wbs: [wbs('solo', '1')] }));
    expect(rows[0]!.revised).toBe(0);
    expect(rows[0]!.variance).toBe(0);
    expect(Number.isNaN(rows[0]!.variance)).toBe(false);
  });
});

describe('sumTotals', () => {
  it('sums root rows only, so children are not counted twice', () => {
    const rows = buildStatementRows(input({
      revised: [
        { wbsItemId: 'c1', costType: 'LABOR', amount: 100 },
        { wbsItemId: 'c2', costType: 'MATERIAL', amount: 300 },
      ],
    }));
    expect(sumTotals(rows).revised).toBe(400);
  });

  it('recomputes available and variance from the totals', () => {
    const rows = buildStatementRows(input({
      revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }],
      committed: [{ wbsItemId: 'c1', amount: 30 }],
      actual: [{ wbsItemId: 'c1', amount: 50 }],
    }));
    const t = sumTotals(rows);
    expect(t.available).toBe(20);
    expect(t.variance).toBe(50);
  });

  it('returns zeros for an empty tree', () => {
    expect(sumTotals([])).toEqual({
      baseline: 0, revised: 0, committed: 0, actual: 0,
      available: 0, variance: 0, varianceBaseline: 0,
    });
  });
});
