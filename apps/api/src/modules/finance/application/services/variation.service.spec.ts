import { VariationService } from './variation.service';

async function expectCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    fail(`expected rejection with code ${code}`);
  } catch (e: unknown) {
    const anyE = e as { getResponse?: () => unknown; code?: string; message?: string };
    const body = anyE.getResponse?.() as { code?: string };
    const got = body?.code ?? anyE.code;
    expect(got).toBe(code);
  }
}

describe('VariationService.approveVariation', () => {
  let service: VariationService;
  const audit = { record: jest.fn() };
  const cache = { del: jest.fn(), delByPattern: jest.fn(), get: jest.fn(), set: jest.fn(), wrap: jest.fn() };

  interface TxMock {
    projectVariation: { update: jest.Mock };
    project: { findUniqueOrThrow: jest.Mock; update: jest.Mock };
  }
  interface PrismaMock {
    projectVariation: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;
  let tx: TxMock;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      projectVariation: { update: jest.fn().mockResolvedValue({ id: 'vr-1', projectId: 'proj-1', type: 'ADDITIVE', amountChange: 1000, variationNumber: 'VR-1' }) },
      project: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'proj-1', contractValue: 10000 }), update: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      projectVariation: { findUnique: jest.fn() },
      $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
    };
    service = new VariationService(prisma as never, audit as never, cache as never);
  });

  it('variation tidak ditemukan -> NotFound VARIATION_NOT_FOUND', async () => {
    prisma.projectVariation.findUnique.mockResolvedValue(null);
    await expectCode(service.approveVariation('vr-1', 'user-1'), 'VARIATION_NOT_FOUND');
    expect(cache.del).not.toHaveBeenCalled();
  });

  it('status bukan POTENTIAL -> Conflict NOT_POTENTIAL', async () => {
    prisma.projectVariation.findUnique.mockResolvedValue({ id: 'vr-1', status: 'APPROVED' });
    await expectCode(service.approveVariation('vr-1', 'user-1'), 'NOT_POTENTIAL');
    expect(cache.del).not.toHaveBeenCalled();
  });

  it('ADDITIVE -> contractValue naik + invalidateAnalytics dipanggil (5 key)', async () => {
    prisma.projectVariation.findUnique.mockResolvedValue({ id: 'vr-1', status: 'POTENTIAL', projectId: 'proj-1', type: 'ADDITIVE', amountChange: 1000, variationNumber: 'VR-1' });

    await service.approveVariation('vr-1', 'user-1');

    expect(tx.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'proj-1' }, data: { contractValue: 11000 } }),
    );
    // approveVariation mengubah project.contractValue -> input analytics; wajib invalidate.
    expect(cache.del).toHaveBeenCalledTimes(5);
  });

  it('DEDUCTIVE -> contractValue turun + tetap invalidate', async () => {
    prisma.projectVariation.findUnique.mockResolvedValue({ id: 'vr-1', status: 'POTENTIAL', projectId: 'proj-1', type: 'DEDUCTIVE', amountChange: 2500, variationNumber: 'VR-1' });
    tx.projectVariation.update.mockResolvedValue({ id: 'vr-1', projectId: 'proj-1', type: 'DEDUCTIVE', amountChange: 2500, variationNumber: 'VR-1' });

    await service.approveVariation('vr-1', 'user-1');

    expect(tx.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { contractValue: 7500 } }),
    );
    expect(cache.del).toHaveBeenCalledTimes(5);
  });
});
