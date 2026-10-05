import { describe, expect, it } from 'vitest';
import { resolvePeriod } from './dashboard-period';

const NOW = new Date('2026-05-15T00:00:00.000Z');

describe('resolvePeriod', () => {
  it('MTD starts on the first of the month', () => {
    expect(resolvePeriod('MTD', NOW)).toEqual({ from: '2026-05-01', to: '2026-05-15' });
  });

  it('QTD starts on the quarter first day', () => {
    expect(resolvePeriod('QTD', NOW)).toEqual({ from: '2026-04-01', to: '2026-05-15' });
  });

  it('YTD starts on Jan 1', () => {
    expect(resolvePeriod('YTD', NOW)).toEqual({ from: '2026-01-01', to: '2026-05-15' });
  });

  it('12M starts 12 months back', () => {
    expect(resolvePeriod('12M', NOW)).toEqual({ from: '2025-05-15', to: '2026-05-15' });
  });

  it('CUSTOM passes through provided bounds', () => {
    expect(resolvePeriod('CUSTOM', NOW, { from: '2026-01-01', to: '2026-02-01' })).toEqual({
      from: '2026-01-01',
      to: '2026-02-01',
    });
  });

  it('CUSTOM with no bounds returns empty', () => {
    expect(resolvePeriod('CUSTOM', NOW)).toEqual({ from: undefined, to: undefined });
  });
});
