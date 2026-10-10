import { legalEntityUsageSchema, updateLegalEntitySchema, legalEntityListParamsSchema } from '@aec/api-contracts';

describe('legal entity contracts', () => {
  it('parses a usage summary', () => {
    const parsed = legalEntityUsageSchema.parse({
      projects: 4,
      users: 12,
      organizations: 3,
      chartOfAccounts: 40,
      bankAccounts: 2,
      periodCloses: 3,
      employees: 8,
      equipment: 5,
      generatedAt: new Date().toISOString(),
    });
    expect(parsed.projects).toBe(4);
  });

  it('accepts a partial update and a status filter', () => {
    expect(updateLegalEntitySchema.parse({ legalName: 'PT Baru' }).legalName).toBe('PT Baru');
    expect(legalEntityListParamsSchema.parse({ status: 'BLOCKED' }).status).toBe('BLOCKED');
  });

  it('rejects an unknown status filter value', () => {
    expect(() => legalEntityListParamsSchema.parse({ status: 'NOPE' })).toThrow();
  });
});
