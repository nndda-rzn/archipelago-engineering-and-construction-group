import { describe, expect, it } from 'vitest';
import { buildEvmPoints } from './portfolio-canvas';

const portfolio = [
  { projectId: 'p1', projectCode: 'PRJ-1', projectName: 'A', client: 'C', status: 'ACTIVE', contractValue: 100, budget: 0, actual: 0, revenue: 0, variance: 0, utilization: null, health: 'NO_BUDGET' as const },
  { projectId: 'p2', projectCode: 'PRJ-2', projectName: 'B', client: 'C', status: 'ACTIVE', contractValue: 200, budget: 100, actual: 120, revenue: 0, variance: -20, utilization: 120, health: 'CRITICAL' as const },
];
const evm = [
  { projectId: 'p1', projectCode: 'PRJ-1', projectName: 'A', bac: 0, ev: 0, pv: 0, ac: 0, cpi: null, spi: null, eac: 0, vac: 0, tcpi: null, progressPercent: 0, hasEvm: false },
  { projectId: 'p2', projectCode: 'PRJ-2', projectName: 'B', bac: 100, ev: 50, pv: 60, ac: 40, cpi: 1.25, spi: 0.83, eac: 80, vac: 20, tcpi: 1.1, progressPercent: 50, hasEvm: true },
];

describe('buildEvmPoints', () => {
  it('uses cpi/spi for projects with EVM data', () => {
    const p = buildEvmPoints(portfolio, evm).find((x) => x.projectId === 'p2')!;
    expect(p.cpi).toBe(1.25);
    expect(p.spi).toBe(0.83);
    expect(p.hasEvm).toBe(true);
  });

  it('marks projects without EVM as hasEvm:false with safe cpi/spi', () => {
    const p = buildEvmPoints(portfolio, evm).find((x) => x.projectId === 'p1')!;
    expect(p.hasEvm).toBe(false);
    expect(Number.isFinite(p.cpi)).toBe(true);
    expect(Number.isFinite(p.spi)).toBe(true);
  });

  it('keeps projects absent from the EVM response (hasEvm:false)', () => {
    const p = buildEvmPoints(portfolio, []).find((x) => x.projectId === 'p2')!;
    expect(p.hasEvm).toBe(false);
  });

  it('returns empty array for empty portfolio', () => {
    expect(buildEvmPoints([], [])).toEqual([]);
  });
});
