import { trendSeriesSchema, decompositionSchema, cashFlowSchema, agingSchema } from '@aec/api-contracts';

/**
 * Kontrak trend-series & decomposition diparse di sini karena
 * `packages/api-contracts` tidak punya test runner sendiri (lihat ledger ruling
 * Task 4). Paket ini diimpor runtime oleh web & api, jadi memvalidasinya dari
 * suite API tetap menguji kontrak nyata.
 */
describe('analytics contracts', () => {
  it('parses a trend series with comparePoints', () => {
    const parsed = trendSeriesSchema.parse({
      metric: 'cashIn',
      unit: 'idr',
      bucket: 'month',
      points: [{ period: '2026-01', value: 100 }],
      comparePoints: [{ period: '2026-01', value: 0 }],
      total: 100,
      generatedAt: new Date().toISOString(),
    });
    expect(parsed.points[0]?.value).toBe(100);
  });

  it('parses a decomposition with others', () => {
    const parsed = decompositionSchema.parse({
      metric: 'cashIn',
      dimension: 'client',
      items: [{ key: 'a', label: 'A', value: 80, share: 0.7 }],
      total: 115,
      others: { value: 15 },
      generatedAt: new Date().toISOString(),
    });
    expect(parsed.others.value).toBe(15);
  });

  it('parses cash flow with an optional period delta', () => {
    const base = {
      series: [{ month: '2026-01', cashIn: 100, cashOut: 40, net: 60 }],
      totalCashIn: 100,
      totalCashOut: 40,
      netCash: 60,
      generatedAt: new Date().toISOString(),
    };
    const delta = { current: 100, previous: 80, pctChange: 25, direction: 'up' as const };
    const withDelta = cashFlowSchema.parse({
      ...base,
      delta: { totalCashIn: delta, totalCashOut: delta, netCash: delta },
    });
    expect(withDelta.delta?.netCash.pctChange).toBe(25);
    // Tanpa delta tetap valid (klien lama).
    expect(cashFlowSchema.parse(base).delta).toBeUndefined();
  });

  it('parses aging with overdue totals and a period delta', () => {
    const bucket = (b: string) => ({ bucket: b, amount: 0, detail: [] });
    const parsed = agingSchema.parse({
      ar: [bucket('CURRENT')],
      ap: [bucket('CURRENT')],
      arOverdue: 500,
      apOverdue: 200,
      delta: {
        ar: { current: 500, previous: 400, pctChange: 25, direction: 'up' },
        ap: { current: 200, previous: 200, pctChange: 0, direction: 'flat' },
        arOverdue: { current: 500, previous: 400, pctChange: 25, direction: 'up' },
        apOverdue: { current: 200, previous: 200, pctChange: 0, direction: 'flat' },
      },
      asOf: new Date().toISOString(),
      basisDate: 'invoiceDate',
      generatedAt: new Date().toISOString(),
    });
    expect(parsed.arOverdue).toBe(500);
    expect(parsed.delta?.ap.direction).toBe('flat');
  });
});
