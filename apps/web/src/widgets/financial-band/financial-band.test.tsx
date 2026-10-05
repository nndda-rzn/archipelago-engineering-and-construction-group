import { describe, expect, it } from 'vitest';
import { agingSegments } from './financial-band';

describe('agingSegments', () => {
  it('maps buckets to labelled segments preserving order', () => {
    const seg = agingSegments([
      { bucket: 'CURRENT', amount: 100 },
      { bucket: '1-30', amount: 50 },
    ]);
    expect(seg).toEqual([
      { label: 'CURRENT', value: 100 },
      { label: '1-30', value: 50 },
    ]);
  });

  it('returns empty array for no buckets', () => {
    expect(agingSegments([])).toEqual([]);
  });
});
