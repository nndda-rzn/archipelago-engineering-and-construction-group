import { describe, expect, it } from 'vitest';
import { hardeningKeys } from './foundation-hardening.api';

describe('hardeningKeys', () => {
  it('keys doa analysis by transaction type', () => {
    expect(hardeningKeys.doaAnalysis('PurchaseOrder')).toEqual(['foundation-hardening', 'doa-analysis', 'PurchaseOrder']);
  });
  it('keys rate history by pair and type', () => {
    expect(hardeningKeys.rateHistory('c1', 'c2', 'SPOT')).toEqual(['foundation-hardening', 'rate-history', 'c1', 'c2', 'SPOT']);
  });
});
