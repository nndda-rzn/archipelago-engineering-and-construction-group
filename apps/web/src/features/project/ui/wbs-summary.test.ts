import { describe, expect, it } from 'vitest';
import { computeWbsSummary } from './wbs-summary';
import type { WbsItem } from '@aec/api-contracts';

const node = (id: string, code: string, name: string, rollup: WbsItem['rollup'], children: WbsItem[] = []): WbsItem => ({
  id, code, name, description: null, sortOrder: 0, progressPercent: 0, plannedStart: null, plannedEnd: null,
  responsibleManager: null, isMilestone: false, rollup, children,
});

describe('computeWbsSummary', () => {
  it('sums budget and actual across root rollups', () => {
    const tree = [
      node('a', '1', 'Engineering', { budget: 4_000, actual: 1_000, progress: 68, childCount: 2 }),
      node('b', '2', 'Procurement', { budget: 6_000, actual: 3_000, progress: 45, childCount: 2 }),
    ];
    const s = computeWbsSummary(tree);
    expect(s.totalBudget).toBe(10_000);
    expect(s.totalActual).toBe(4_000);
  });

  it('weights total progress by branch budget', () => {
    const tree = [
      node('a', '1', 'Engineering', { budget: 1_000, actual: 0, progress: 100, childCount: 0 }),
      node('b', '2', 'Procurement', { budget: 3_000, actual: 0, progress: 0, childCount: 0 }),
    ];
    // (100*1000 + 0*3000) / 4000 = 25
    expect(computeWbsSummary(tree).totalProgress).toBe(25);
  });

  it('returns null progress when no branch reports one', () => {
    const tree = [node('a', '1', 'Engineering', { budget: 1_000, actual: 0, progress: null, childCount: 0 })];
    expect(computeWbsSummary(tree).totalProgress).toBeNull();
  });

  it('exposes each root as a composition branch with its share of budget', () => {
    const tree = [
      node('a', '1', 'Engineering', { budget: 3_000, actual: 0, progress: 50, childCount: 0 }),
      node('b', '2', 'Procurement', { budget: 1_000, actual: 0, progress: 50, childCount: 0 }),
    ];
    const s = computeWbsSummary(tree);
    expect(s.branches.map((b) => b.code)).toEqual(['1', '2']);
    expect(s.branches[0]!.sharePct).toBe(75);
    expect(s.rootCount).toBe(2);
  });

  it('returns a zeroed summary for an empty tree', () => {
    const s = computeWbsSummary([]);
    expect(s.totalBudget).toBe(0);
    expect(s.totalActual).toBe(0);
    expect(s.totalProgress).toBeNull();
    expect(s.branches).toEqual([]);
    expect(s.rootCount).toBe(0);
  });

  it('weights progress by budget, ignoring zero-budget branches', () => {
    const tree = [
      node('a', '1', 'Engineering', { budget: 0, actual: 0, progress: 90, childCount: 0 }),
      node('b', '2', 'Procurement', { budget: 2_000, actual: 0, progress: 40, childCount: 0 }),
    ];
    // Only b carries weight → 40, the 90 of the budget-less branch does not dilute it.
    expect(computeWbsSummary(tree).totalProgress).toBe(40);
  });

  it('falls back to a plain average when no branch has budget', () => {
    const tree = [
      node('a', '1', 'Engineering', { budget: 0, actual: 0, progress: 90, childCount: 0 }),
      node('b', '2', 'Procurement', { budget: 0, actual: 0, progress: 40, childCount: 0 }),
    ];
    expect(computeWbsSummary(tree).totalProgress).toBe(65);
  });
});
