import { lastNMonthsUtc, monthSpanUtc } from './analytics-date';

describe('lastNMonthsUtc', () => {
  it('returns N months ending at the current month, oldest first', () => {
    const now = new Date('2026-10-15T00:00:00.000Z');
    expect(lastNMonthsUtc(6, now)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
  });

  it('rolls across a year boundary', () => {
    const now = new Date('2026-02-10T00:00:00.000Z');
    expect(lastNMonthsUtc(3, now)).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});

describe('monthSpanUtc', () => {
  it('covers every month the range touches, oldest first', () => {
    expect(monthSpanUtc(new Date('2026-01-15T00:00:00.000Z'), new Date('2026-03-02T00:00:00.000Z'))).toEqual([
      '2026-01', '2026-02', '2026-03',
    ]);
  });

  it('normalises reversed arguments', () => {
    expect(monthSpanUtc(new Date('2026-03-02T00:00:00.000Z'), new Date('2026-01-15T00:00:00.000Z'))).toEqual([
      '2026-01', '2026-02', '2026-03',
    ]);
  });
});
