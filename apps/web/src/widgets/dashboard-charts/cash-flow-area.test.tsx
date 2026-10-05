import { describe, expect, it } from 'vitest';
import { toAreaSeries } from './cash-flow-area';

describe('toAreaSeries', () => {
  it('adds a cumulative net column', () => {
    const out = toAreaSeries([
      { month: '2026-01', cashIn: 100, cashOut: 40, net: 60 },
      { month: '2026-02', cashIn: 50, cashOut: 30, net: 20 },
    ]);
    expect(out[0]!.cumulative).toBe(60);
    expect(out[1]!.cumulative).toBe(80);
  });
  it('handles a single month without dividing by zero', () => {
    const out = toAreaSeries([{ month: '2026-01', cashIn: 10, cashOut: 0, net: 10 }]);
    expect(out).toHaveLength(1);
    expect(out[0]!.cumulative).toBe(10);
  });
  it('returns empty for no series', () => {
    expect(toAreaSeries([])).toEqual([]);
  });
});
