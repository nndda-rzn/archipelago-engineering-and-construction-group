import { describe, expect, it } from 'vitest';
import { heroNarrative, summarizePortfolio } from './hero-band';

describe('heroNarrative', () => {
  it('states cash on hand, net flow direction, critical projects and open NCRs', () => {
    const text = heroNarrative({ cashOnHand: 18240500000, netCashFlow: 420000000, criticalProjects: 3, openNcrs: 2 });
    expect(text).toMatch(/cash on hand/i);
    expect(text).toMatch(/positive/i);
    expect(text).toContain('3');
    expect(text).toContain('2');
  });

  it('says negative flow when net cash flow is below zero', () => {
    expect(heroNarrative({ cashOnHand: 0, netCashFlow: -5, criticalProjects: 0, openNcrs: 0 })).toMatch(/negative/i);
  });
});

describe('summarizePortfolio', () => {
  it('re-aggregates KPI from a filtered item list', () => {
    const items = [
      { projectId: 'p1', projectCode: 'A', projectName: 'A', client: 'C', status: 'ACTIVE', contractValue: 100, budget: 80, actual: 90, revenue: 0, variance: -10, utilization: 112, health: 'CRITICAL' as const },
      { projectId: 'p2', projectCode: 'B', projectName: 'B', client: 'C', status: 'ACTIVE', contractValue: 200, budget: 150, actual: 100, revenue: 0, variance: 50, utilization: 66, health: 'ON_TRACK' as const },
    ];
    const s = summarizePortfolio(items);
    expect(s.projectCount).toBe(2);
    expect(s.totalContract).toBe(300);
    expect(s.totalBudget).toBe(230);
    expect(s.totalActual).toBe(190);
    expect(s.criticalProjects).toBe(1);
  });

  it('returns zeroed totals for an empty list', () => {
    expect(summarizePortfolio([])).toEqual({ projectCount: 0, totalContract: 0, totalBudget: 0, totalActual: 0, criticalProjects: 0 });
  });
});
