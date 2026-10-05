import { describe, expect, it } from 'vitest';
import { buildCanvasPoints } from './portfolio-canvas';

const items = [
  { projectId: 'p1', projectCode: 'PRJ-1', projectName: 'A', client: 'C', status: 'ACTIVE', contractValue: 100, budget: 0, actual: 0, revenue: 0, variance: 0, utilization: null, health: 'NO_BUDGET' as const },
  { projectId: 'p2', projectCode: 'PRJ-2', projectName: 'B', client: 'C', status: 'ACTIVE', contractValue: 200, budget: 100, actual: 120, revenue: 0, variance: -20, utilization: 120, health: 'CRITICAL' as const },
];
const costs = [{ projectCode: 'PRJ-2', projectName: 'B', contractValue: 200, budget: 100, cost: 120, revenue: 0, margin: 0, budgetUsagePct: 120 }];

describe('buildCanvasPoints', () => {
  it('does not divide by zero for a no-budget project', () => {
    const p = buildCanvasPoints(items, costs).find((x) => x.projectCode === 'PRJ-1')!;
    expect(p.usage).toBe(0);
    expect(p.hasBudget).toBe(false);
    expect(Number.isFinite(p.usage)).toBe(true);
  });

  it('does not produce -Infinity margin when revenue is zero', () => {
    const p = buildCanvasPoints(items, costs).find((x) => x.projectCode === 'PRJ-2')!;
    expect(p.margin).toBe(0);
    expect(p.hasRevenue).toBe(false);
    expect(Number.isFinite(p.margin)).toBe(true);
  });

  it('keeps projects absent from cost summary (margin 0)', () => {
    const p = buildCanvasPoints(items, []).find((x) => x.projectCode === 'PRJ-1')!;
    expect(p.margin).toBe(0);
    expect(p.hasRevenue).toBe(false);
  });

  it('computes usage percentage from budget and actual', () => {
    const p = buildCanvasPoints(items, costs).find((x) => x.projectCode === 'PRJ-2')!;
    expect(p.usage).toBe(120);
    expect(p.hasBudget).toBe(true);
  });
});
