import { CurrencyService } from './currency.service';

function makeService(prisma: unknown, audit = { record: jest.fn() }) {
  return new CurrencyService(prisma as never, audit as never);
}

describe('CurrencyService.rateHistory', () => {
  it('returns points ordered by effective date ascending', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { effectiveDate: new Date('2026-03-01'), rate: 15200 },
      { effectiveDate: new Date('2026-01-01'), rate: 15000 },
    ]);
    const svc = makeService({ exchangeRate: { findMany } } as never);
    const out = await svc.rateHistory('c1', 'c2');
    expect(out.points.map((p) => p.rate)).toEqual([15000, 15200]);
    expect(out.rateType).toBe('SPOT');
  });
});

describe('CurrencyService.setCurrencyStatus', () => {
  it('rejects a no-op transition with 409 INVALID_STATUS_TRANSITION', async () => {
    const prisma = {
      currency: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', isActive: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as never;
    const svc = makeService(prisma);
    const err = await svc.setCurrencyStatus('c1', 'ACTIVE', 'u1').catch((e) => e);
    expect((err as { response?: { code?: string } }).response).toEqual(expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }));
  });

  it('flips isActive and audits', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      currency: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', isActive: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as never;
    const svc = makeService(prisma, audit);
    await svc.setCurrencyStatus('c1', 'INACTIVE', 'u1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'Currency.STATUS' }));
  });
});
