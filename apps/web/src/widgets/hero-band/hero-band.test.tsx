import { describe, expect, it } from 'vitest';
import { heroNarrative } from './hero-band';

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
