import { computeWbsRollup } from './wbs-rollup';

const nodes = [
  { id: 'a', parentId: null },
  { id: 'b', parentId: 'a' },
  { id: 'c', parentId: 'a' },
  { id: 'd', parentId: null },
];

const budget = new Map([
  ['b', 100],
  ['c', 300],
]);
const actual = new Map([['b', 40]]);
const progress = new Map([
  ['b', 100],
  ['c', 0],
]);

describe('computeWbsRollup', () => {
  it('weights parent progress by child budget', () => {
    const r = computeWbsRollup(nodes, budget, actual, progress);
    // (100 * 100 + 0 * 300) / 400 = 25
    expect(r.get('a')!.progress).toBe(25);
    expect(r.get('a')!.budget).toBe(400);
    expect(r.get('a')!.childCount).toBe(2);
  });

  it('sums actual up the tree', () => {
    const r = computeWbsRollup(nodes, budget, actual, progress);
    expect(r.get('a')!.actual).toBe(40);
  });

  it('returns null progress for a leaf with none entered', () => {
    const r = computeWbsRollup(nodes, budget, actual, progress);
    expect(r.get('d')!.progress).toBeNull();
  });

  it('falls back to a plain average when no child carries budget', () => {
    const noBudget = new Map<string, number>();
    const r = computeWbsRollup(nodes, noBudget, actual, progress);
    expect(r.get('a')!.progress).toBe(50); // (100 + 0) / 2
  });

  it('uses the leaf own value for a childless node', () => {
    const r = computeWbsRollup(nodes, budget, actual, progress);
    expect(r.get('b')!.progress).toBe(100);
    expect(r.get('c')!.progress).toBe(0);
  });
});
