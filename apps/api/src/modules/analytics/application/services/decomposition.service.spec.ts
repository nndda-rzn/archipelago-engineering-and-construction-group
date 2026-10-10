import { DecompositionService } from './decomposition.service';
import type { MetricRow } from './shared/metric-registry';

function svc(rows: MetricRow[]) {
  const prisma = {} as never;
  const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;
  const registry = { resolveRows: async () => rows } as never;
  return new DecompositionService(prisma, cache, registry);
}

const r = (key: string, value: number): MetricRow => ({ key, label: key, date: new Date('2026-01-01T00:00:00Z'), value });

describe('DecompositionService', () => {
  it('groups by key, sorts desc, and reconciles items + others = total', async () => {
    const s = svc([r('a', 50), r('a', 30), r('b', 20), r('c', 10), r('d', 5)]);
    const out = await s.decomposition({ metric: 'cashIn', dimension: 'client', limit: 2 });
    expect(out.items.map((i) => [i.key, i.value])).toEqual([
      ['a', 80],
      ['b', 20],
    ]);
    expect(out.others.value).toBe(15);
    expect(out.items.reduce((s2, i) => s2 + i.value, 0) + out.others.value).toBe(out.total);
    expect(out.total).toBe(115);
    expect(out.items[0]?.share).toBeCloseTo(80 / 115, 3);
  });

  it('returns empty items and zero totals when there is no data', async () => {
    const s = svc([]);
    const out = await s.decomposition({ metric: 'budget', dimension: 'costType' });
    expect(out.items).toEqual([]);
    expect(out.total).toBe(0);
    expect(out.others.value).toBe(0);
  });

  it('uses a different cache key when compare=previous', async () => {
    const keys: string[] = [];
    const cache = { wrap: (k: string, _t: number, fn: () => Promise<unknown>) => { keys.push(k); return fn(); } } as never;
    const registry = { resolveRows: async () => [] } as never;
    const s = new DecompositionService({} as never, cache, registry);

    await s.decomposition({ metric: 'cashIn', dimension: 'client' });
    await s.decomposition({ metric: 'cashIn', dimension: 'client', compare: 'previous' });

    expect(keys[0]).not.toBe(keys[1]);
  });
});
