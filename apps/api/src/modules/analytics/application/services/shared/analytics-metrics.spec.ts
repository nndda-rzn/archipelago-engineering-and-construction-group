import { computeDelta, monthlySeries } from './analytics-metrics';

describe('computeDelta', () => {
  it('is null pctChange when previous is zero', () => {
    const d = computeDelta(100, 0);
    expect(d.pctChange).toBeNull();
    expect(d.direction).toBe('up');
  });

  it('is flat when both are zero', () => {
    expect(computeDelta(0, 0).direction).toBe('flat');
  });

  it('computes pct change and direction', () => {
    const d = computeDelta(120, 100);
    expect(d.pctChange).toBe(20);
    expect(d.direction).toBe('up');
  });
});

describe('monthlySeries', () => {
  it('buckets rows into the last 6 months, zero-filling gaps', () => {
    const now = new Date('2026-10-15T00:00:00.000Z');
    const series = monthlySeries(
      [
        { at: new Date('2026-10-02T00:00:00.000Z'), value: 100 },
        { at: new Date('2026-10-20T00:00:00.000Z'), value: 50 },
        { at: new Date('2026-08-01T00:00:00.000Z'), value: 30 },
      ],
      now,
    );
    expect(series).toHaveLength(6);
    expect(series.map((p) => p.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(series.find((p) => p.month === '2026-10')?.value).toBe(150);
    expect(series.find((p) => p.month === '2026-08')?.value).toBe(30);
    expect(series.find((p) => p.month === '2026-06')?.value).toBe(0);
  });

  it('returns an all-zero series when there are no rows', () => {
    const series = monthlySeries([], new Date('2026-10-15T00:00:00.000Z'));
    expect(series).toHaveLength(6);
    expect(series.every((p) => p.value === 0)).toBe(true);
  });
});
