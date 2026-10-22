import { buildBudgetTree, collectWarnings, type BudgetNodeInput, type BudgetRowInput, type SpendInput } from './budget-tree';

const node = (id: string, code: string, parentId: string | null = null): BudgetNodeInput => ({
  id,
  code,
  name: `n${id}`,
  parentId,
});

const row = (wbsItemId: string, costType: BudgetRowInput['costType'], amount: number): BudgetRowInput => ({
  wbsItemId,
  costType,
  amount,
});

const spend = (wbsItemId: string, amount: number): SpendInput => ({ wbsItemId, amount });

describe('buildBudgetTree', () => {
  it('rolls child budget and spend up to the parent', () => {
    const tree = buildBudgetTree(
      [node('p', '1'), node('c1', '1.1', 'p'), node('c2', '1.2', 'p')],
      [row('c1', 'LABOR', 100), row('c2', 'MATERIAL', 300)],
      [spend('c1', 40)],
      new Map(),
    );
    const parent = tree[0]!;
    expect(parent.budget).toBe(400);
    expect(parent.used).toBe(40);
    expect(parent.remaining).toBe(360);
    expect(parent.byCostType).toEqual({ LABOR: 100, MATERIAL: 300 });
    expect(parent.childrenCount).toBe(2);
    expect(parent.depth).toBe(0);
    expect(parent.children[0]!.depth).toBe(1);
  });

  it('keeps a node that owns budget and children from double counting', () => {
    const tree = buildBudgetTree(
      [node('p', '1'), node('c', '1.1', 'p')],
      [row('p', 'LABOR', 50), row('c', 'MATERIAL', 100)],
      [spend('p', 10), spend('c', 20)],
      new Map(),
    );
    const parent = tree[0]!;
    expect(parent.budget).toBe(150);
    expect(parent.used).toBe(30);
    expect(parent.remaining).toBe(120);
  });

  it('treats an orphan as a root instead of dropping it', () => {
    const tree = buildBudgetTree([node('x', '9', 'missing-parent')], [], [], new Map());
    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe('x');
    expect(tree[0]!.depth).toBe(0);
  });

  it('does not hang on a parent cycle', () => {
    const tree = buildBudgetTree([node('a', '1', 'b'), node('b', '2', 'a')], [], [], new Map());
    // Keduanya tidak bisa di-resolusi ke root; keduanya diperlakukan sebagai root.
    expect(tree.length).toBeGreaterThanOrEqual(1);
    expect(tree.every((n) => n.depth === 0)).toBe(true);
  });

  it('reports zero rather than NaN when a node has no budget and no spend', () => {
    const tree = buildBudgetTree([node('a', '1')], [], [], new Map());
    expect(tree[0]!.budget).toBe(0);
    expect(tree[0]!.used).toBe(0);
    expect(tree[0]!.remaining).toBe(0);
    expect(Number.isNaN(tree[0]!.remaining)).toBe(false);
  });

  it('carries planned value from the map, defaulting to zero', () => {
    const tree = buildBudgetTree(
      [node('a', '1'), node('b', '2')],
      [row('a', 'LABOR', 100)],
      [],
      new Map([['a', 60]]),
    );
    expect(tree[0]!.plannedValue).toBe(60);
    expect(tree[1]!.plannedValue).toBe(0);
  });

  it('orders siblings by code so the tree reads like a WBS', () => {
    const tree = buildBudgetTree([node('b', '2'), node('a', '1'), node('c', '10')], [], [], new Map());
    expect(tree.map((n) => n.code)).toEqual(['1', '2', '10']);
  });
});

describe('collectWarnings', () => {
  it('flags a total above the contract value', () => {
    const tree = buildBudgetTree([node('a', '1')], [row('a', 'LABOR', 500)], [], new Map());
    const w = collectWarnings({ budget: 500, used: 0, contractValue: 400 }, tree, 0);
    expect(w.overContract).toBe(true);
  });

  it('does not flag overContract when the total fits', () => {
    const tree = buildBudgetTree([node('a', '1')], [row('a', 'LABOR', 400)], [], new Map());
    const w = collectWarnings({ budget: 400, used: 0, contractValue: 400 }, tree, 0);
    expect(w.overContract).toBe(false);
  });

  it('lists leaf nodes without budget and nodes over-allocated', () => {
    const tree = buildBudgetTree(
      [node('a', '1'), node('b', '2')],
      [row('b', 'LABOR', 900)],
      [spend('b', 950)],
      new Map(),
    );
    const w = collectWarnings({ budget: 900, used: 950, contractValue: 5000 }, tree, 0);
    expect(w.noBudget.map((n) => n.code)).toEqual(['1']);
    expect(w.overAllocated.map((n) => n.code)).toEqual(['2']);
    expect(w.overAllocated[0]!.amount).toBe(50);
  });

  it('does not list a parent without own budget as noBudget', () => {
    // Induk yang hanya me-rollup anaknya bukan "tanpa budget".
    const tree = buildBudgetTree(
      [node('p', '1'), node('c', '1.1', 'p')],
      [row('c', 'LABOR', 100)],
      [],
      new Map(),
    );
    const w = collectWarnings({ budget: 100, used: 0, contractValue: 5000 }, tree, 0);
    expect(w.noBudget).toEqual([]);
  });

  it('flags a PV that does not match BAC', () => {
    const tree = buildBudgetTree([node('a', '1')], [row('a', 'LABOR', 1000)], [], new Map());
    const w = collectWarnings({ budget: 1000, used: 0, contractValue: 5000 }, tree, 600);
    expect(w.pvMismatch).not.toBeNull();
    expect(w.pvMismatch!.ratio).toBeCloseTo(0.6, 2);
    expect(w.pvMismatch!.bac).toBe(1000);
  });

  it('reports no mismatch when PV equals BAC', () => {
    const tree = buildBudgetTree([node('a', '1')], [row('a', 'LABOR', 1000)], [], new Map());
    expect(collectWarnings({ budget: 1000, used: 0, contractValue: 5000 }, tree, 1000).pvMismatch).toBeNull();
  });

  it('reports no mismatch when there is no baseline at all', () => {
    const tree = buildBudgetTree([node('a', '1')], [], [], new Map());
    expect(collectWarnings({ budget: 0, used: 0, contractValue: 5000 }, tree, 0).pvMismatch).toBeNull();
  });
});
