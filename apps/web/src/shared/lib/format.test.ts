import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatIdr, formatNumber } from './format';

describe('formatIdr', () => {
  it('format nominal IDR', () => {
    expect(formatIdr(1000000)).toContain('1.000.000');
  });

  it('format nol', () => {
    expect(formatIdr(0)).toContain('0');
  });
});

describe('formatNumber', () => {
  it('format ribuan', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
  });
});

describe('formatDate', () => {
  it('format tanggal valid', () => {
    const out = formatDate('2026-08-27T00:00:00Z');
    expect(out).toMatch(/2026/);
    expect(out).toContain('Agu');
  });

  it('null -> fallback dash', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('invalid -> fallback dash', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('format tanggal + jam', () => {
    const out = formatDateTime('2026-08-27T10:30:00Z');
    expect(out).toMatch(/2026/);
  });

  it('null -> fallback dash', () => {
    expect(formatDateTime(undefined)).toBe('—');
  });
});
