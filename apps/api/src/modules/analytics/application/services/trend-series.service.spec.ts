import { TrendSeriesService } from './trend-series.service';
import type { MetricRow } from './shared/metric-registry';

function svc(rows: MetricRow[]) {
  const prisma = {} as never;
  const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;
  const registry = { resolveRows: async () => rows } as never;
  return new TrendSeriesService(prisma, cache, registry);
}

const r = (date: string, value: number): MetricRow => ({ key: 'p1', label: 'P1', date: new Date(date), value });

describe('TrendSeriesService', () => {
  it('fills empty periods with 0 and sums the total', async () => {
    const s = svc([r('2026-01-10T00:00:00Z', 100)]);
    const out = await s.series({ metric: 'cashIn', from: '2026-01-01', to: '2026-03-31', bucket: 'month' });
    expect(out.points).toEqual([
      { period: '2026-01', value: 100 },
      { period: '2026-02', value: 0 },
      { period: '2026-03', value: 0 },
    ]);
    expect(out.total).toBe(100);
  });

  it('adds comparePoints (zeros) when compare=previous has no data', async () => {
    const s = svc([]);
    const out = await s.series({ metric: 'cashIn', from: '2026-01-01', to: '2026-03-31', compare: 'previous' });
    expect(out.comparePoints).toHaveLength(out.points.length);
    expect(out.comparePoints!.every((p: { value: number }) => p.value === 0)).toBe(true);
  });

  it('uses a different cache key when compare=previous, so the overlay is not masked by a cached plain response', async () => {
    const keys: string[] = [];
    const cache = { wrap: (k: string, _t: number, fn: () => Promise<unknown>) => { keys.push(k); return fn(); } } as never;
    const registry = { resolveRows: async () => [] } as never;
    const s = new TrendSeriesService({} as never, cache, registry);

    await s.series({ metric: 'cashIn', from: '2026-01-01', to: '2026-03-31' });
    await s.series({ metric: 'cashIn', from: '2026-01-01', to: '2026-03-31', compare: 'previous' });

    expect(keys[0]).not.toBe(keys[1]);
  });
});
