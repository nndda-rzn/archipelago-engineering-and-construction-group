import {
  buildStatementRows,
  collectStatementWarnings,
  costCoverage,
  reconcile,
  sumTotals,
  type StatementInput,
} from './budget-baseline';

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

describe('pvCoverage', () => {
  const totals = { revised: 1000, contractValue: 5000 };
  const rows = buildStatementRows(input({ revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 1000 }] }));

  it('reports NO_BASELINE when pv is zero', () => {
    expect(collectStatementWarnings(totals, rows, 0).pvCoverage.status).toBe('NO_BASELINE');
  });

  it('does not warn when pv is below bac — that is normal for a time-phased baseline', () => {
    const w = collectStatementWarnings(totals, rows, 600);
    expect(w.pvCoverage.status).toBe('COMPLETE');
    // Rasio lama sengaja tidak ada lagi: PV != BAC bukan pelanggaran (spec 4.7).
    expect('ratio' in w.pvCoverage).toBe(false);
  });

  it('reports PARTIAL when pv exceeds bac', () => {
    expect(collectStatementWarnings(totals, rows, 1200).pvCoverage.status).toBe('PARTIAL');
  });

  it('carries pv and bac verbatim so the UI can show the real numbers', () => {
    const w = collectStatementWarnings(totals, rows, 600);
    expect(w.pvCoverage.pv).toBe(600);
    expect(w.pvCoverage.bac).toBe(1000);
  });
});

describe('collectStatementWarnings', () => {
  const totals = { revised: 1000, contractValue: 5000 };

  it('flags a revised total above the contract value', () => {
    const rows = buildStatementRows(input({ revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 1000 }] }));
    expect(collectStatementWarnings({ revised: 6000, contractValue: 5000 }, rows, 0).overContract).toBe(true);
  });

  it('does not flag overContract when the total fits', () => {
    const rows = buildStatementRows(input({ revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 1000 }] }));
    expect(collectStatementWarnings({ revised: 5000, contractValue: 5000 }, rows, 0).overContract).toBe(false);
  });

  it('flags overCommitted only on leaves, and only when committed exceeds revised', () => {
    const rows = buildStatementRows(input({
      revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }],
      committed: [{ wbsItemId: 'c1', amount: 150 }],
    }));
    const w = collectStatementWarnings(totals, rows, 0);
    expect(w.overCommitted.map((n) => n.code)).toEqual(['1.1']);
    expect(w.overCommitted[0]!.amount).toBe(50);
  });

  it('does not flag a parent whose children are over-committed', () => {
    const rows = buildStatementRows(input({
      revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }],
      committed: [{ wbsItemId: 'c1', amount: 150 }],
    }));
    expect(collectStatementWarnings(totals, rows, 0).overCommitted.map((n) => n.code)).not.toContain('1');
  });

  it('lists leaf nodes with no revised budget', () => {
    const rows = buildStatementRows(input({ revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }] }));
    expect(collectStatementWarnings(totals, rows, 0).noBudget.map((n) => n.code)).toEqual(['1.2']);
  });

  it('does not list a parent that only rolls up its children as noBudget', () => {
    const rows = buildStatementRows(input({ revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }] }));
    expect(collectStatementWarnings(totals, rows, 0).noBudget.map((n) => n.code)).not.toContain('1');
  });
});

describe('reconcile', () => {
  it('flags doubleCountRisk only when both sides are positive', () => {
    expect(reconcile(100, 50).doubleCountRisk).toBe(true);
    expect(reconcile(100, 0).doubleCountRisk).toBe(false);
    expect(reconcile(0, 50).doubleCountRisk).toBe(false);
    expect(reconcile(0, 0).doubleCountRisk).toBe(false);
  });

  it('reports both sides verbatim', () => {
    const r = reconcile(2_258_823_529_412, 75_000_000_000);
    expect(r.ledgerOut).toBe(2_258_823_529_412);
    expect(r.journalExpense610).toBe(75_000_000_000);
  });
});

describe('costCoverage', () => {
  it('counts nodes that actually carry spend', () => {
    const rows = buildStatementRows(input({ actual: [{ wbsItemId: 'c1', amount: 10 }] }));
    expect(costCoverage(rows)).toEqual({ allocatedNodes: 2, totalNodes: 3 });
  });

  it('reports zero allocated when nothing has been spent', () => {
    const rows = buildStatementRows(input());
    expect(costCoverage(rows)).toEqual({ allocatedNodes: 0, totalNodes: 3 });
  });
});
