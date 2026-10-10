import { ConflictException, NotFoundException } from '@nestjs/common';
import { MasterDataService } from './master-data.service';

function makeService(prisma: unknown, audit: unknown = { record: jest.fn() }) {
  return new MasterDataService(prisma as never, audit as never);
}

describe('MasterDataService — vendor update & status', () => {
  it('updates only the provided fields and audits the change', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'v1', name: 'New Name', category: 'SERVICE' });
    const audit = { record: jest.fn() };
    const prisma = {
      vendor: {
        findUnique: jest.fn().mockResolvedValue({ id: 'v1', name: 'Old', category: 'MATERIAL' }),
        update,
      },
    } as never;
    const svc = makeService(prisma, audit);

    await svc.updateVendor('v1', { name: 'New Name' }, 'u1');

    expect(update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { name: 'New Name' } });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'Vendor.UPDATE', resourceId: 'v1' }));
  });

  it('throws NotFound when updating a missing vendor', async () => {
    const prisma = { vendor: { findUnique: jest.fn().mockResolvedValue(null) } } as never;
    await expect(makeService(prisma).updateVendor('nope', { name: 'X' }, 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('toggles vendor status and audits it', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'v1', status: 'INACTIVE' });
    const audit = { record: jest.fn() };
    const prisma = {
      vendor: { findUnique: jest.fn().mockResolvedValue({ id: 'v1', status: 'ACTIVE' }), update },
    } as never;
    const svc = makeService(prisma, audit);

    await svc.setVendorStatus('v1', { status: 'INACTIVE' }, 'u1');

    expect(update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { status: 'INACTIVE' } });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'Vendor.STATUS' }));
  });
});

describe('MasterDataService — vendor search', () => {
  it('adds an OR search across name, code and tax id when search is given', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      vendor: { findMany, count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;

    await makeService(prisma).listVendors({ search: 'baja' });

    const where = findMany.mock.calls[0]![0].where;
    expect(where.OR).toHaveLength(3);
    expect(where.OR[0]).toEqual({ name: { contains: 'baja', mode: 'insensitive' } });
  });

  it('omits the OR clause when search is empty', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      vendor: { findMany, count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;

    await makeService(prisma).listVendors({});

    expect(findMany.mock.calls[0]![0].where.OR).toBeUndefined();
  });
});

describe('MasterDataService — vendor stats', () => {
  it('returns counts, category breakdown and average rating', async () => {
    const prisma = {
      vendor: {
        count: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(4).mockResolvedValueOnce(1),
        findMany: jest.fn().mockResolvedValue([{ category: 'MATERIAL' }, { category: 'MATERIAL' }, { category: 'SERVICE' }]),
      },
      vendorPerformanceRating: { findMany: jest.fn().mockResolvedValue([{ score: 4 }, { score: 5 }]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;

    const out = await makeService(prisma).vendorStats();

    expect(out.total).toBe(5);
    expect(out.active).toBe(4);
    expect(out.inactive).toBe(1);
    expect(out.avgScore).toBe(4.5);
    expect(out.byCategory[0]).toEqual({ category: 'MATERIAL', count: 2 });
    expect(out.byCategory[1]).toEqual({ category: 'SERVICE', count: 1 });
  });
});

describe('MasterDataService — fiscal period transition rules', () => {
  const svcWith = (status: string) => {
    const update = jest.fn().mockResolvedValue({ id: 'p1', status: 'OPEN' });
    const prisma = {
      fiscalPeriod: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', status, periodCode: '2026-01' }), update },
    } as never;
    return { svc: makeService(prisma), update };
  };

  it('allows moving forward one step (FUTURE -> OPEN)', async () => {
    const { svc, update } = svcWith('FUTURE');
    await svc.updateFiscalPeriodStatus('p1', { status: 'OPEN' }, 'u1');
    expect(update).toHaveBeenCalled();
  });

  it('allows reopening one step (SOFT_CLOSED -> OPEN)', async () => {
    const { svc, update } = svcWith('SOFT_CLOSED');
    await svc.updateFiscalPeriodStatus('p1', { status: 'OPEN' }, 'u1');
    expect(update).toHaveBeenCalled();
  });

  it('rejects a skipped transition (FUTURE -> CLOSED) with INVALID_TRANSITION', async () => {
    const { svc, update } = svcWith('FUTURE');
    await expect(svc.updateFiscalPeriodStatus('p1', { status: 'CLOSED' }, 'u1')).rejects.toMatchObject({
      response: { code: 'INVALID_TRANSITION' },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects reopening a LOCKED period (final state)', async () => {
    const { svc } = svcWith('LOCKED');
    await expect(svc.updateFiscalPeriodStatus('p1', { status: 'CLOSED' }, 'u1')).rejects.toBeInstanceOf(ConflictException);
  });
});
