import { monthKeyUtc } from './month-key';

describe('monthKeyUtc', () => {
  it('formats a date as YYYY-MM in UTC', () => {
    expect(monthKeyUtc(new Date('2026-10-06T00:00:00.000Z'))).toBe('2026-10');
    expect(monthKeyUtc(new Date('2026-01-31T23:59:59.000Z'))).toBe('2026-01');
  });

  it('pads single-digit months', () => {
    expect(monthKeyUtc(new Date('2026-03-15T12:00:00.000Z'))).toBe('2026-03');
  });

  it('uses UTC, not local time (a UTC month boundary is stable)', () => {
    // 1 Jan 00:30 UTC = 31 Dec 07:30 in Jakarta; the UTC key must stay January.
    expect(monthKeyUtc(new Date('2026-01-01T00:30:00.000Z'))).toBe('2026-01');
  });
});
