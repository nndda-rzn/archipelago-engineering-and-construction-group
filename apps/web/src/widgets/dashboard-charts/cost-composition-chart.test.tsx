import { describe, expect, it } from 'vitest';
import { hasCostData } from './cost-composition-chart';

describe('hasCostData', () => {
  it('is false when every amount is zero', () => {
    expect(hasCostData([{ costType: 'MATERIAL', amount: 0 }])).toBe(false);
  });
  it('is false for an empty list', () => {
    expect(hasCostData([])).toBe(false);
  });
  it('is true when any amount is positive', () => {
    expect(hasCostData([{ costType: 'MATERIAL', amount: 5 }])).toBe(true);
  });
});
