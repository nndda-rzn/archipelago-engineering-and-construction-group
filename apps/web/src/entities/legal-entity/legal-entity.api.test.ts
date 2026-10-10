import { describe, expect, it } from 'vitest';
import { legalEntityKeys } from './legal-entity.api';

describe('legalEntityKeys', () => {
  it('builds detail and usage query keys', () => {
    expect(legalEntityKeys.detail('le1')).toEqual(['legal-entities', 'detail', 'le1']);
    expect(legalEntityKeys.usage('le1')).toEqual(['legal-entities', 'usage', 'le1']);
  });
});
