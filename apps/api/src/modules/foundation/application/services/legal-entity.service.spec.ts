import { NotFoundException } from '@nestjs/common';
import { LegalEntityService } from './legal-entity.service';

function makeService(prisma: unknown) {
  return new LegalEntityService(prisma as never, { record: jest.fn() } as never);
}

describe('LegalEntityService.usage', () => {
  it('returns zero counts for an entity with no related records', async () => {
    const prisma = {
      legalEntity: { findUnique: jest.fn().mockResolvedValue({ id: 'le1' }) },
      project: { count: jest.fn().mockResolvedValue(0) },
      user: { count: jest.fn().mockResolvedValue(0) },
      organization: { count: jest.fn().mockResolvedValue(0) },
      chartOfAccount: { count: jest.fn().mockResolvedValue(0) },
      bankAccount: { count: jest.fn().mockResolvedValue(0) },
      periodClose: { count: jest.fn().mockResolvedValue(0) },
      employee: { count: jest.fn().mockResolvedValue(0) },
      equipment: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    } as never;
    const svc = makeService(prisma);
    const usage = await svc.usage('le1');
    expect(usage.projects).toBe(0);
    expect(usage.equipment).toBe(0);
    expect(typeof usage.generatedAt).toBe('string');
  });

  it('throws LEGAL_ENTITY_NOT_FOUND for an unknown id', async () => {
    const prisma = { legalEntity: { findUnique: jest.fn().mockResolvedValue(null) } } as never;
    const svc = makeService(prisma);
    await expect(svc.usage('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
