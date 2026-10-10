import { organizationNodeSchema, doaAnalysisSchema, rateHistorySchema, updateOrganizationSchema } from '@aec/api-contracts';

describe('foundation hardening contracts', () => {
  it('parses a recursive organization tree node', () => {
    const parsed = organizationNodeSchema.parse({
      item: { id: 'o1', legalEntityId: 'le1', name: 'Group', orgType: 'GROUP', parentId: null, effectiveFrom: '2026-01-01', effectiveTo: null, status: 'ACTIVE' },
      children: [
        {
          item: { id: 'o2', legalEntityId: 'le1', name: 'BU', orgType: 'BUSINESS_UNIT', parentId: 'o1', effectiveFrom: '2026-01-01', effectiveTo: null, status: 'ACTIVE' },
          children: [],
        },
      ],
    });
    expect(parsed.children[0]?.item.name).toBe('BU');
  });

  it('parses a doa analysis with overlaps and gaps', () => {
    const parsed = doaAnalysisSchema.parse({
      transactionType: 'PurchaseOrder',
      overlaps: [{ aId: 'r1', bId: 'r2', from: 100, to: 200 }],
      gaps: [{ from: 500, to: 1000 }],
      generatedAt: new Date().toISOString(),
    });
    expect(parsed.overlaps[0]?.from).toBe(100);
  });

  it('parses a rate history series', () => {
    const parsed = rateHistorySchema.parse({
      fromCurrencyId: 'c1',
      toCurrencyId: 'c2',
      rateType: 'SPOT',
      points: [{ effectiveDate: '2026-01-01', rate: 15000 }],
      generatedAt: new Date().toISOString(),
    });
    expect(parsed.points[0]?.rate).toBe(15000);
  });

  it('accepts a partial organization update', () => {
    expect(updateOrganizationSchema.parse({ name: 'Renamed' }).name).toBe('Renamed');
  });
});
