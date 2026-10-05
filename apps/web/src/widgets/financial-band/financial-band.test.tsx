import { describe, expect, it } from 'vitest';
import { hasOutstanding, agingSegments } from './financial-band';

describe('hasOutstanding', () => {
  it('is false when every bucket is zero', () => {
    expect(hasOutstanding([{ bucket: 'CURRENT', amount: 0 }, { bucket: '90+', amount: 0 }])).toBe(false);
  });
  it('is true when any bucket has value', () => {
    expect(hasOutstanding([{ bucket: 'CURRENT', amount: 0 }, { bucket: '1-30', amount: 5 }])).toBe(true);
  });
  it('is false for an empty list', () => {
    expect(hasOutstanding([])).toBe(false);
  });
});

describe('agingSegments', () => {
  it('maps buckets to labelled segments preserving order', () => {
    expect(agingSegments([{ bucket: 'CURRENT', amount: 100 }, { bucket: '1-30', amount: 50 }])).toEqual([
      { label: 'CURRENT', value: 100 },
      { label: '1-30', value: 50 },
    ]);
  });
  it('returns empty array for no buckets', () => {
    expect(agingSegments([])).toEqual([]);
  });
});

