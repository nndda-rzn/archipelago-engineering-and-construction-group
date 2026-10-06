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

  it('honours from/to on the invoice date (previously ignored)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      clientInvoice: { findMany },
      vendorInvoice: { findMany: jest.fn().mockResolvedValue([]) },
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;

    const svc = new AnalyticsService(prisma, cache);
    await svc.aging({ from: '2026-01-01', to: '2026-03-31' });

    const where = findMany.mock.calls[0]![0].where;
    expect(where.invoiceDate.gte).toEqual(new Date('2026-01-01'));
    expect(where.invoiceDate.lte).toEqual(new Date('2026-03-31'));
  });

  it('uses invoiceDate for AP too (not createdAt), so both sides age the same way', async () => {
    const vendorFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      clientInvoice: { findMany: jest.fn().mockResolvedValue([]) },
      vendorInvoice: { findMany: vendorFindMany },
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;

    const svc = new AnalyticsService(prisma, cache);
    await svc.aging({ from: '2026-02-01' });

    const where = vendorFindMany.mock.calls[0]![0].where;
    expect(where.invoiceDate).toEqual({ gte: new Date('2026-02-01') });
    expect(where.createdAt).toBeUndefined();
    // Dan basis tanggal yang dilaporkan harus menyatakan itu.
    const res = await svc.aging();
    expect(res.basisDate).toBe('invoiceDate');
  });

  it('reports the outstanding invoice behind each bucket as detail rows', async () => {
    const invoiceDate = new Date();
    invoiceDate.setDate(invoiceDate.getDate() - 45); // bucket 31-60
    const prisma = {
      clientInvoice: {
        findMany: jest.fn().mockResolvedValue([
          {
            invoiceNumber: 'CINV-1', client: 'PT Klien', totalAmount: 100_000, invoiceDate,
            collections: [{ amount: 40_000 }], project: { code: 'PRJ-1' },
          },
        ]),
      },
      vendorInvoice: { findMany: jest.fn().mockResolvedValue([]) },
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;

    const svc = new AnalyticsService(prisma, cache);
    const res = await svc.aging();

    const bucket = res.ar.find((b) => b.bucket === '31-60');
    expect(bucket?.amount).toBe(60_000);
    expect(bucket?.detail).toHaveLength(1);
    expect(bucket?.detail[0]).toMatchObject({ invoiceNumber: 'CINV-1', party: 'PT Klien', projectCode: 'PRJ-1', outstanding: 60_000 });
    expect(bucket?.detail[0]?.ageDays).toBeGreaterThanOrEqual(44);
    expect(res.basisDate).toBe('invoiceDate');
    expect(typeof res.asOf).toBe('string');
  });

  it('excludes fully-paid invoices from both the bucket and its detail', async () => {
    const prisma = {
      clientInvoice: {
        findMany: jest.fn().mockResolvedValue([
          { invoiceNumber: 'CINV-PAID', client: 'X', totalAmount: 100, invoiceDate: new Date(), collections: [{ amount: 100 }], project: null },
        ]),
      },
      vendorInvoice: { findMany: jest.fn().mockResolvedValue([]) },
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;

    const svc = new AnalyticsService(prisma, cache);
    const res = await svc.aging();
    expect(res.ar.find((b) => b.bucket === 'CURRENT')?.amount).toBe(0);
    expect(res.ar.flatMap((b) => b.detail)).toHaveLength(0);
  });
});

describe('AnalyticsService.cashFlow', () => {
  it('zero-fills a continuous month range so gaps do not silently disappear', async () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5));
    const prisma = {
      collection: { findMany: jest.fn().mockResolvedValue([{ totalAmount: 500, collectedAt: thisMonth }]) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;

    const svc = new AnalyticsService(prisma, cache);
    const res = await svc.cashFlow();

    expect(res.series).toHaveLength(6);
    // Bulan berjalan punya nilai; bulan kosong tetap ada dengan 0.
    const currentKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    expect(res.series.find((s) => s.month === currentKey)?.cashIn).toBe(500);
    expect(res.series.filter((s) => s.month !== currentKey).every((s) => s.cashIn === 0)).toBe(true);
  });
});

describe('AnalyticsService.arConcentration', () => {
  it('groups outstanding AR by client, sorted desc, with percentage of total', async () => {
    const prisma = {
      clientInvoice: {
        findMany: jest.fn().mockResolvedValue([
          { client: 'PT A', totalAmount: 300, collections: [] },
          { client: 'PT B', totalAmount: 100, collections: [] },
          { client: 'PT A', totalAmount: 100, collections: [] },
        ]),
      },
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;

    const svc = new AnalyticsService(prisma, cache);
    const res = await svc.arConcentration();

    expect(res.total).toBe(500);
    expect(res.items[0]).toMatchObject({ client: 'PT A', amount: 400, pct: 80 });
    expect(res.items[1]).toMatchObject({ client: 'PT B', amount: 100, pct: 20 });
  });
});

describe('AnalyticsService.forecastVsActual', () => {
  it('pairs each forecast period with the actual net cash for that month', async () => {
    const prisma = {
      cashForecast: { findMany: jest.fn().mockResolvedValue([{ period: '2026-08', netForecast: 1000 }]) },
      collection: { findMany: jest.fn().mockResolvedValue([{ totalAmount: 800, collectedAt: new Date('2026-08-10') }]) },
      payment: { findMany: jest.fn().mockResolvedValue([{ totalAmount: 300, paymentDate: new Date('2026-08-20') }]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;

    const svc = new AnalyticsService(prisma, cache);
    const res = await svc.forecastVsActual();

    expect(res.periods).toHaveLength(1);
    expect(res.periods[0]).toMatchObject({ period: '2026-08', forecastNet: 1000, actualNet: 500 });
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

describe('AnalyticsService.monthlySeries', () => {
  const svc = new AnalyticsService({} as never, {} as never);

  it('buckets rows into the last 6 months, zero-filling gaps', () => {
    const now = new Date('2026-10-15T00:00:00.000Z');
    const series = svc.monthlySeries(
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
    const series = svc.monthlySeries([], new Date('2026-10-15T00:00:00.000Z'));
    expect(series).toHaveLength(6);
    expect(series.every((p) => p.value === 0)).toBe(true);
  });
});
