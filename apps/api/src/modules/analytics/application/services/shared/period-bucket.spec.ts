import { bucketOf, periodsBetween } from './period-bucket';

describe('period-bucket', () => {
  it('buckets by month and quarter (UTC)', () => {
    expect(bucketOf(new Date('2026-02-15T00:00:00Z'), 'month')).toBe('2026-02');
    expect(bucketOf(new Date('2026-05-01T00:00:00Z'), 'quarter')).toBe('2026-Q2');
  });

  it('enumerates periods inclusively', () => {
    expect(periodsBetween(new Date('2026-01-01T00:00:00Z'), new Date('2026-03-31T00:00:00Z'), 'month'))
      .toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('enumerates quarters inclusively', () => {
    expect(periodsBetween(new Date('2026-01-01T00:00:00Z'), new Date('2026-07-01T00:00:00Z'), 'quarter'))
      .toEqual(['2026-Q1', '2026-Q2', '2026-Q3']);
  });
});
