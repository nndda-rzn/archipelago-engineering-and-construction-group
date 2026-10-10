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

describe('LegalEntityService.findAll', () => {
  it('filters by status and attaches per-entity metrics without N+1', async () => {
    const projectGroupBy = jest.fn().mockResolvedValue([{ legalEntityId: 'le1', _count: { _all: 4 } }]);
    const prisma = {
      legalEntity: {
        findMany: jest.fn().mockResolvedValue([{ id: 'le1', code: 'AEC-CON', status: 'ACTIVE' }]),
        count: jest.fn().mockResolvedValue(1),
      },
      project: { groupBy: projectGroupBy },
      user: { groupBy: jest.fn().mockResolvedValue([]) },
      organization: { groupBy: jest.fn().mockResolvedValue([]) },
      chartOfAccount: { groupBy: jest.fn().mockResolvedValue([]) },
      bankAccount: { groupBy: jest.fn().mockResolvedValue([]) },
      periodClose: { groupBy: jest.fn().mockResolvedValue([]) },
      employee: { groupBy: jest.fn().mockResolvedValue([]) },
      equipment: { groupBy: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    } as never;
    const svc = new LegalEntityService(prisma, { record: jest.fn() } as never);
    const result = await svc.findAll({ status: 'ACTIVE' } as never);
    expect(result.items[0]?.metrics?.projects).toBe(4);
    expect(projectGroupBy).toHaveBeenCalledTimes(1);
  });
});

describe('LegalEntityService currency FK resolution', () => {
  it('resolves currency codes to ids on create so the FK is populated', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'le2', code: 'AEC-X', legalName: 'X', functionalCurrency: 'IDR', reportingCurrency: 'USD' });
    const prisma = {
      currency: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'cur-idr' })
          .mockResolvedValueOnce({ id: 'cur-usd' }),
      },
      legalEntity: { create },
    } as never;
    const svc = new LegalEntityService(prisma, { record: jest.fn() } as never);
    await svc.create({ code: 'AEC-X', legalName: 'X', taxIdentifier: 't', country: 'ID', functionalCurrency: 'IDR', reportingCurrency: 'USD' } as never, 'u1');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ functionalCurrencyId: 'cur-idr', reportingCurrencyId: 'cur-usd' }) }),
    );
  });

  it('rejects an unknown currency code', async () => {
    const prisma = { currency: { findUnique: jest.fn().mockResolvedValue(null) }, legalEntity: { create: jest.fn() } } as never;
    const svc = new LegalEntityService(prisma, { record: jest.fn() } as never);
    await expect(
      svc.create({ code: 'AEC-X', legalName: 'X', taxIdentifier: 't', country: 'ID', functionalCurrency: 'XXX', reportingCurrency: 'XXX' } as never, 'u1'),
    ).rejects.toMatchObject({ response: { code: 'UNKNOWN_CURRENCY' } });
  });
});
