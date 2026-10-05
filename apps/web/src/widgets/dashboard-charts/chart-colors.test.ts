import { describe, expect, it } from 'vitest';
import { CHART, HEALTH_COLORS, AGING_COLORS, COST_COLORS } from './chart-colors';

describe('chart-colors', () => {
  it('uses the neutral-200 token for grid lines', () => {
    expect(CHART.grid).toBe('#e4e4e7');
  });
  it('maps every health key to the project-* tokens', () => {
    expect(HEALTH_COLORS.ON_TRACK).toBe('#22c55e');
    expect(HEALTH_COLORS.AT_RISK).toBe('#f59e0b');
    expect(HEALTH_COLORS.CRITICAL).toBe('#ef4444');
    expect(HEALTH_COLORS.NO_BUDGET).toBe('#a1a1aa');
  });
  it('has five aging colours', () => {
    expect(AGING_COLORS).toHaveLength(5);
  });
  it('covers every costType', () => {
    for (const k of ['DIRECT', 'LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'INDIRECT', 'OVERHEAD']) {
      expect(COST_COLORS[k]).toBeTruthy();
    }
  });
});
