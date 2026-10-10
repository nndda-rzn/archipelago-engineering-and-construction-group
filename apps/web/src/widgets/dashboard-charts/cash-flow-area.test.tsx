import { describe, expect, it } from 'vitest';
import { toAreaSeries, trimLeadingZeros } from './cash-flow-area';

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

describe('trimLeadingZeros', () => {
  it('drops leading all-zero months but keeps zeros in the middle', () => {
    const out = trimLeadingZeros([
      { month: '2026-01', net: 0 },
      { month: '2026-02', net: 0 },
      { month: '2026-03', net: 100 },
      { month: '2026-04', net: 0 },
      { month: '2026-05', net: 50 },
    ]);
    expect(out.map((p) => p.month)).toEqual(['2026-03', '2026-04', '2026-05']);
  });

  it('returns the series unchanged when the first month already has activity', () => {
    const series = [{ month: '2026-01', net: 10 }, { month: '2026-02', net: 0 }];
    expect(trimLeadingZeros(series)).toBe(series);
  });

  it('returns the series unchanged when everything is zero (no false emptiness)', () => {
    const series = [{ month: '2026-01', net: 0 }, { month: '2026-02', net: 0 }];
    expect(trimLeadingZeros(series)).toBe(series);
  });
});
