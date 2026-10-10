import { trendSeriesSchema, decompositionSchema } from '@aec/api-contracts';

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
});
