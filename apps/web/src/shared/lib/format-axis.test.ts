import { describe, expect, it } from 'vitest';
import { formatIdrAxis, formatIdrCompact } from './format';

describe('formatIdrAxis', () => {
  it('formats millions with an explicit "jt" unit', () => {
    expect(formatIdrAxis(12_000_000)).toBe('Rp 12 jt');
  });

  it('formats billions with an explicit "M" unit', () => {
    expect(formatIdrAxis(1_500_000_000)).toBe('Rp 1,5 M');
  });

  it('formats trillions with a "T" unit', () => {
    expect(formatIdrAxis(4_800_000_000_000)).toBe('Rp 4,8 T');
  });

  it('keeps a negative sign', () => {
    expect(formatIdrAxis(-25_000_000)).toBe('−Rp 25 jt');
  });

  it('formats zero without a unit suffix', () => {
    expect(formatIdrAxis(0)).toBe('Rp 0');
  });

  it('drops trailing zeros (1.0 -> "1")', () => {
    expect(formatIdrAxis(1_000_000_000)).toBe('Rp 1 M');
  });
});

describe('formatIdrCompact', () => {
  it('keeps two decimals for large magnitudes (trillions)', () => {
    expect(formatIdrCompact(6_246_138_966_310)).toBe('Rp 6,25 T');
  });

  it('keeps two decimals for billions', () => {
    expect(formatIdrCompact(40_150_000_000)).toBe('Rp 40,15 M');
  });

  it('matches formatIdrAxis (one shared formatter)', () => {
    expect(formatIdrCompact(12_000_000)).toBe(formatIdrAxis(12_000_000));
  });
});
