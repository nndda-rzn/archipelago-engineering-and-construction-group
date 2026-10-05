import { AnalyticsService } from './analytics.service';
import { analyticsCacheKey } from '@/shared/cache/analytics-cache';

describe('analyticsCacheKey', () => {
  it('suffixes with all + empty bounds when no filter', () => {
    expect(analyticsCacheKey('analytics:executive', {})).toBe('analytics:executive:all::');
  });

  it('suffixes with entity and bounds', () => {
    expect(
      analyticsCacheKey('analytics:executive', { legalEntityId: 'LE1', from: '2026-01-01', to: '2026-03-31' }),
    ).toBe('analytics:executive:LE1:2026-01-01:2026-03-31');
  });
});

describe('AnalyticsService.aging filter', () => {
  it('passes legalEntityId into client invoice where-clause', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      clientInvoice: { findMany },
      vendorInvoice: { findMany: jest.fn().mockResolvedValue([]) },
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;

    const svc = new AnalyticsService(prisma, cache);
    await svc.aging({ legalEntityId: 'LE1' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'POSTED', project: { legalEntityId: 'LE1' } }),
      }),
    );
  });
});

describe('AnalyticsService.signals', () => {
  it('omits signals with count 0 and reports oldestAgeDays', async () => {
    const now = Date.now();
    const prisma = {
      ncr: { findMany: jest.fn().mockResolvedValue([{ createdAt: new Date(now - 12 * 86400000) }, { createdAt: new Date(now - 2 * 86400000) }]) },
      hseIncident: { findMany: jest.fn().mockResolvedValue([]) },
      punchListItem: { findMany: jest.fn().mockResolvedValue([]) },
      progressClaim: { findMany: jest.fn().mockResolvedValue([]) },
      equipmentPm: { findMany: jest.fn().mockResolvedValue([]) },
      approvalTask: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;

    const svc = new AnalyticsService(prisma, cache);
    const result = await svc.signals();

    const ncrs = result.signals.find((s) => s.key === 'ncrs');
    expect(ncrs?.count).toBe(2);
    expect(ncrs?.oldestAgeDays).toBeGreaterThanOrEqual(11);
    expect(result.signals.find((s) => s.key === 'incidents')).toBeUndefined();
  });
});

describe('AnalyticsService.computeDelta', () => {
  const svc = new AnalyticsService({} as never, { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never);

  it('is null pctChange when previous is zero', () => {
    const d = svc.computeDelta(100, 0);
    expect(d.pctChange).toBeNull();
    expect(d.direction).toBe('up');
  });

  it('is flat when both are zero', () => {
    const d = svc.computeDelta(0, 0);
    expect(d.direction).toBe('flat');
  });

  it('computes pct change and direction', () => {
    const d = svc.computeDelta(120, 100);
    expect(d.pctChange).toBe(20);
    expect(d.direction).toBe('up');
  });
});

describe('AnalyticsService.costComposition', () => {
  it('groups published budget by costType and totals it', async () => {
    const prisma = {
      budgetItem: {
        groupBy: jest.fn().mockResolvedValue([
          { costType: 'MATERIAL', _sum: { amount: 300 } },
          { costType: 'LABOR', _sum: { amount: 100 } },
        ]),
      },
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;
    const svc = new AnalyticsService(prisma, cache);

    const result = await svc.costComposition();
    expect(result.total).toBe(400);
    expect(result.items.find((i) => i.costType === 'MATERIAL')?.amount).toBe(300);
  });
});
