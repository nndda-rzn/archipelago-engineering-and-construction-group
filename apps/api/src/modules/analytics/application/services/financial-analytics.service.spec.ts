import { FinancialAnalyticsService } from './financial-analytics.service';

/** Cache transparan: langsung menjalankan fn, tidak menyimpan apa pun. */
const passthroughCache = () => ({ wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() }) as never;

describe('FinancialAnalyticsService.cashFlow compare', () => {
  it('adds delta for totalCashIn/Out/netCash against the previous period', async () => {
    // Rentang eksplisit H1-2026 → pembanding otomatis H2-2025 (digeser sepanjang rentang).
    const filter = { from: '2026-01-01', to: '2026-06-30' };
    const collectionFind = jest
      .fn()
      .mockResolvedValueOnce([{ totalAmount: 500, collectedAt: new Date('2026-03-10') }])
      .mockResolvedValueOnce([{ totalAmount: 400, collectedAt: new Date('2025-09-10') }]);
    const paymentFind = jest
      .fn()
      .mockResolvedValueOnce([{ totalAmount: 200, paymentDate: new Date('2026-04-10') }])
      .mockResolvedValueOnce([{ totalAmount: 250, paymentDate: new Date('2025-11-10') }]);

    const prisma = {
      collection: { findMany: collectionFind },
      payment: { findMany: paymentFind },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;

    const svc = new FinancialAnalyticsService(prisma, passthroughCache());
    const res = await svc.cashFlow(filter, 'previous');

    expect(res.delta).toBeDefined();
    expect(res.delta?.totalCashIn).toMatchObject({ current: 500, previous: 400, direction: 'up' });
    expect(res.delta?.totalCashOut).toMatchObject({ current: 200, previous: 250, direction: 'down' });
    expect(res.delta?.netCash).toMatchObject({ current: 300, previous: 150, direction: 'up' });
    expect(res.delta?.netCash.pctChange).toBe(100);
  });

  it('omits delta when compare is not requested', async () => {
    const prisma = {
      collection: { findMany: jest.fn().mockResolvedValue([]) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;
    const svc = new FinancialAnalyticsService(prisma, passthroughCache());
    const res = await svc.cashFlow();
    expect(res.delta).toBeUndefined();
  });

  it('reports pctChange null when the previous period had zero', async () => {
    const filter = { from: '2026-01-01', to: '2026-06-30' };
    const collectionFind = jest
      .fn()
      .mockResolvedValueOnce([{ totalAmount: 500, collectedAt: new Date('2026-03-10') }])
      .mockResolvedValueOnce([]);
    const prisma = {
      collection: { findMany: collectionFind },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;
    const svc = new FinancialAnalyticsService(prisma, passthroughCache());
    const res = await svc.cashFlow(filter, 'previous');
    expect(res.delta?.totalCashIn.pctChange).toBeNull();
    expect(res.delta?.totalCashIn.direction).toBe('up');
  });
});

describe('FinancialAnalyticsService.aging compare (historical snapshot)', () => {
  it('reconstructs outstanding as of the previous period end (payments after that date are ignored)', async () => {
    const now = new Date();
    const invoiceDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 10));
    // Invoice 1000; dibayar 300 pada bulan ini. Outstanding "sekarang" = 700,
    // outstanding pada akhir bulan lalu (sebelum pembayaran) = 1000.
    const collections = [
      { amount: 300, collection: { collectedAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5)) } },
    ];

    const prisma = {
      clientInvoice: {
        findMany: jest.fn().mockResolvedValue([
          { invoiceNumber: 'CINV-1', client: 'PT A', totalAmount: 1000, invoiceDate, collections, project: { code: 'PRJ-1' } },
        ]),
      },
      vendorInvoice: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;

    const svc = new FinancialAnalyticsService(prisma, passthroughCache());
    const res = await svc.aging({}, 'previous');

    const totalAr = (buckets: { amount: number }[]) => buckets.reduce((s, b) => s + b.amount, 0);
    // Sekarang: 1000 − 300 = 700.
    expect(totalAr(res.ar)).toBe(700);
    // Periode lalu (akhir bulan lalu): pembayaran bulan ini belum terjadi → 1000.
    expect(res.delta?.ar).toMatchObject({ current: 700, previous: 1000, direction: 'down' });
  });

  it('reports arOverdue/apOverdue and their deltas', async () => {
    const now = new Date();
    // Invoice berumur 45 hari → bucket 31-60 (overdue) untuk snapshot "sekarang".
    const invoiceDate = new Date(now.getTime() - 45 * 86400000);
    const prisma = {
      clientInvoice: {
        findMany: jest.fn().mockResolvedValue([
          { invoiceNumber: 'CINV-1', client: 'PT A', totalAmount: 1000, invoiceDate, collections: [], project: null },
        ]),
      },
      vendorInvoice: {
        findMany: jest.fn().mockResolvedValue([
          { invoiceNumber: 'VINV-1', vendor: 'PT V', totalAmount: 400, invoiceDate, payments: [], project: null },
        ]),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;

    const svc = new FinancialAnalyticsService(prisma, passthroughCache());
    const res = await svc.aging({}, 'previous');

    expect(res.arOverdue).toBe(1000);
    expect(res.apOverdue).toBe(400);
    expect(res.delta?.arOverdue.current).toBe(1000);
    expect(res.delta?.apOverdue.current).toBe(400);
  });

  it('omits delta and overdue totals when compare is not requested', async () => {
    const prisma = {
      clientInvoice: { findMany: jest.fn().mockResolvedValue([]) },
      vendorInvoice: { findMany: jest.fn().mockResolvedValue([]) },
    } as never;
    const svc = new FinancialAnalyticsService(prisma, passthroughCache());
    const res = await svc.aging();
    expect(res.delta).toBeUndefined();
  });
});
