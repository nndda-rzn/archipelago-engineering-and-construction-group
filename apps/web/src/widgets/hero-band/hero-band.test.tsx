import { describe, expect, it } from 'vitest';
import { heroNarrative } from './hero-band';

describe('heroNarrative', () => {
  it('summarizes net cash, critical projects and open NCRs', () => {
    const text = heroNarrative({ netCash: 1240500000, criticalProjects: 3, openNcrs: 2 });
    expect(text).toMatch(/positive/i);
    expect(text).toContain('3');
    expect(text).toContain('2');
  });

  it('says negative when net cash is below zero', () => {
    expect(heroNarrative({ netCash: -5, criticalProjects: 0, openNcrs: 0 })).toMatch(/negative/i);
  });
});
