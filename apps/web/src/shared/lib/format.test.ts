import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatIdr, formatNumber, formatRelativeTime } from './format';

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

describe('formatRelativeTime', () => {
  const at = (msAgo: number) => new Date(Date.now() - msAgo);

  it('baru saja -> just now', () => {
    expect(formatRelativeTime(at(10_000))).toBe('just now');
  });

  it('menit dengan pluralisasi Inggris', () => {
    expect(formatRelativeTime(at(60_000))).toBe('1 minute ago');
    expect(formatRelativeTime(at(5 * 60_000))).toBe('5 minutes ago');
  });

  it('jam dengan pluralisasi Inggris', () => {
    expect(formatRelativeTime(at(3 * 60 * 60_000))).toBe('3 hours ago');
  });

  it('hari dengan pluralisasi Inggris', () => {
    expect(formatRelativeTime(at(2 * 24 * 60 * 60_000))).toBe('2 days ago');
  });

  it('null -> fallback dash', () => {
    expect(formatRelativeTime(null)).toBe('—');
  });
});
