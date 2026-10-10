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

function usageCounts() {
  return {
    project: { count: jest.fn().mockResolvedValue(0) },
    user: { count: jest.fn().mockResolvedValue(0) },
    organization: { count: jest.fn().mockResolvedValue(0) },
    chartOfAccount: { count: jest.fn().mockResolvedValue(0) },
    bankAccount: { count: jest.fn().mockResolvedValue(0) },
    periodClose: { count: jest.fn().mockResolvedValue(0) },
    employee: { count: jest.fn().mockResolvedValue(0) },
    equipment: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };
}

describe('LegalEntityService lifecycle', () => {
  it('does not re-block an already-blocked entity (CAS count 0) and does not double-audit', async () => {
    const audit = { record: jest.fn() };
    const prisma = {
      legalEntity: {
        findUnique: jest.fn().mockResolvedValue({ id: 'le1', status: 'BLOCKED' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'le1', status: 'BLOCKED' }),
      },
      ...usageCounts(),
    } as never;
    const svc = new LegalEntityService(prisma, audit as never);
    const result = await svc.block('le1', 'u1');
    expect(result.status).toBe('BLOCKED');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects unblocking an entity that is not BLOCKED', async () => {
    const prisma = {
      legalEntity: {
        findUnique: jest.fn().mockResolvedValue({ id: 'le1', status: 'ACTIVE' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as never;
    const svc = new LegalEntityService(prisma, { record: jest.fn() } as never);
    await expect(svc.unblock('le1', 'u1')).rejects.toMatchObject({ response: { code: 'INVALID_STATUS_TRANSITION' } });
  });

  it('records an audit entry on a successful block', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      legalEntity: {
        findUnique: jest.fn().mockResolvedValue({ id: 'le1', status: 'ACTIVE' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'le1', status: 'BLOCKED' }),
      },
      ...usageCounts(),
    } as never;
    const svc = new LegalEntityService(prisma, audit as never);
    await svc.block('le1', 'u1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LEGAL_ENTITY.BLOCK', resourceId: 'le1' }),
    );
  });
});
