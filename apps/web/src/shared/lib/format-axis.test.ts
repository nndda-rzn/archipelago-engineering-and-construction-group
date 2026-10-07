import { describe, expect, it } from 'vitest';
import { formatIdrAxis } from './format';

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
