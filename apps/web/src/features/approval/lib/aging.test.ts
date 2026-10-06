import { describe, expect, it } from 'vitest';
import { OVERDUE_DAYS, DUE_SOON_DAYS, agingFrom, ageInDays, agingLabel } from './aging';

const NOW = new Date('2026-10-06T12:00:00.000Z');

describe('ageInDays', () => {
  it('counts whole days between submission and now', () => {
    expect(ageInDays('2026-10-04T12:00:00.000Z', NOW)).toBe(2);
  });

  it('returns 0 for something submitted minutes ago', () => {
    expect(ageInDays('2026-10-06T11:30:00.000Z', NOW)).toBe(0);
  });

  it('never returns a negative age for a future timestamp (clock skew)', () => {
    expect(ageInDays('2026-10-07T12:00:00.000Z', NOW)).toBe(0);
  });

  it('returns 0 for an unparseable date instead of NaN', () => {
    expect(ageInDays('not-a-date', NOW)).toBe(0);
  });
});

describe('agingFrom — threshold levels', () => {
  const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

  it('is "ok" below the due-soon threshold', () => {
    expect(agingFrom(daysAgo(0), NOW).level).toBe('ok');
  });

  it('is "due-soon" from DUE_SOON_DAYS up to (not including) OVERDUE_DAYS', () => {
    expect(agingFrom(daysAgo(DUE_SOON_DAYS), NOW).level).toBe('due-soon');
    expect(agingFrom(daysAgo(OVERDUE_DAYS - 1), NOW).level).toBe('due-soon');
  });

  it('is "overdue" at OVERDUE_DAYS and beyond', () => {
    expect(agingFrom(daysAgo(OVERDUE_DAYS), NOW).level).toBe('overdue');
    expect(agingFrom(daysAgo(OVERDUE_DAYS + 10), NOW).level).toBe('overdue');
  });

  it('exposes the days and a 0..1 ratio for the bar (capped at 1)', () => {
    const a = agingFrom(daysAgo(OVERDUE_DAYS), NOW);
    expect(a.days).toBe(OVERDUE_DAYS);
    expect(a.ratio).toBe(1);
    expect(agingFrom(daysAgo(OVERDUE_DAYS * 3), NOW).ratio).toBe(1);
    expect(agingFrom(daysAgo(0), NOW).ratio).toBe(0);
  });
});

describe('agingLabel — text is the primary signal, colour is secondary', () => {
  const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

  it('describes age and urgency in words', () => {
    expect(agingLabel(agingFrom(daysAgo(0), NOW))).toBe('today');
    expect(agingLabel(agingFrom(daysAgo(1), NOW))).toBe('1 day ago · Due soon');
    expect(agingLabel(agingFrom(daysAgo(2), NOW))).toBe('2 days ago · Due soon');
    expect(agingLabel(agingFrom(daysAgo(OVERDUE_DAYS), NOW))).toBe(`${OVERDUE_DAYS} days ago · Overdue`);
  });
});
