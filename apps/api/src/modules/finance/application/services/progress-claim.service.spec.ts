import { ProgressClaimService } from './progress-claim.service';
import type { CertifyClaimDto } from '../../presentation/dto/finance.dto';

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

describe('ProgressClaimService.certifyClaim (T4/T10)', () => {
  let service: ProgressClaimService;
  const audit = { record: jest.fn() };
  const cache = { del: jest.fn() };

  interface TxMock {
    progressClaim: {
      findUnique: jest.Mock;
      aggregate: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
  }
  interface PrismaMock {
    progressClaim: { findUnique: jest.Mock; aggregate: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;
  let tx: TxMock;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      progressClaim: {
        findUnique: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { recoveryAmount: null } }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'clm-1', status: 'CERTIFIED' }),
      },
    };
    prisma = {
      progressClaim: {
        // Kode versi baru hanya butuh `{ id }`; `aggregate`/`update` disediakan agar versi lama
        // tetap dapat dieksekusi (dipakai untuk bukti red→green), bukan oleh kode saat ini.
        findUnique: jest.fn().mockResolvedValue({ id: 'clm-1' }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { recoveryAmount: null } }),
        update: jest.fn().mockResolvedValue({ id: 'clm-1', status: 'CERTIFIED' }),
      },
      $transaction: jest.fn((cb: (t: TxMock) => unknown) => cb(tx)),
    };
    service = new ProgressClaimService(prisma as never, audit as never, cache as never);
  });

  const dto = (over: Partial<CertifyClaimDto> = {}): CertifyClaimDto => ({
    certifiedAmount: 100,
    ...over,
  });

  const primeClaim = (over: Partial<{ amount: number; status: string; advanceAmount: number | null; advanceRecoveryRate: number }> = {}) => {
    const claim = {
      id: 'clm-1',
      claimNumber: 'CLM-0001',
      projectId: 'proj-1',
      status: over.status ?? 'DRAFT',
      amount: over.amount ?? 100,
      project: {
        advanceAmount: over.advanceAmount ?? null,
        advanceRecoveryRate: over.advanceRecoveryRate ?? 0,
      },
    };
    tx.progressClaim.findUnique.mockResolvedValue(claim);
    // Versi lama membaca lewat prisma langsung; diset juga agar dapat dieksekusi untuk red-evidence.
    prisma.progressClaim.findUnique.mockResolvedValue(claim);
  };

  it('claim tidak ditemukan -> NotFound CLAIM_NOT_FOUND', async () => {
    prisma.progressClaim.findUnique.mockResolvedValue(null);
    await expectCode(service.certifyClaim('clm-1', dto(), 'user-1'), 'CLAIM_NOT_FOUND');
  });

  it('status bukan DRAFT (dibaca di dalam tx) -> Conflict NOT_DRAFT', async () => {
    primeClaim({ status: 'CERTIFIED' });
    await expectCode(service.certifyClaim('clm-1', dto(), 'user-1'), 'NOT_DRAFT');
  });

  it('T10: certifiedAmount melebihi amount klaim -> CERTIFIED_EXCEEDS_CLAIM', async () => {
    primeClaim({ amount: 100 });
    await expectCode(service.certifyClaim('clm-1', dto({ certifiedAmount: 150 }), 'user-1'), 'CERTIFIED_EXCEEDS_CLAIM');
    expect(tx.progressClaim.updateMany).not.toHaveBeenCalled();
  });

  it('certifiedAmount tepat sama dengan amount -> boleh', async () => {
    primeClaim({ amount: 100 });
    await service.certifyClaim('clm-1', dto({ certifiedAmount: 100 }), 'user-1');
    expect(tx.progressClaim.updateMany).toHaveBeenCalled();
  });

  it('valid -> CAS DRAFT->CERTIFIED di dalam tx, tanpa DP tidak menghitung recovery', async () => {
    primeClaim({ advanceAmount: null });
    const result = await service.certifyClaim('clm-1', dto({ certifiedAmount: 100, retentionRate: 5 }), 'user-1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.progressClaim.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'clm-1', status: 'DRAFT' } }),
    );
    const data = tx.progressClaim.updateMany.mock.calls[0][0].data as { retentionAmount: number; netCertifiedAmount: number };
    expect(data.retentionAmount).toBe(5);
    expect(data.netCertifiedAmount).toBe(95);
    expect(tx.progressClaim.aggregate).not.toHaveBeenCalled();
    expect(result.status).toBe('CERTIFIED');
  });

  describe('recovery DP (FR-CMR-004)', () => {
    it('menghitung recovery dari sisa DP, agregat dibaca DI DALAM tx', async () => {
      primeClaim({ amount: 1000, advanceAmount: 1000, advanceRecoveryRate: 10 });
      tx.progressClaim.aggregate.mockResolvedValue({ _sum: { recoveryAmount: 200 } }); // sudah recover 200
      // netCertified = 1000 (tanpa retensi); recovery = min(1000*10% = 100, sisa 800, 1000) = 100
      await service.certifyClaim('clm-1', dto({ certifiedAmount: 1000 }), 'user-1');

      const data = tx.progressClaim.updateMany.mock.calls[0][0].data as { recoveryAmount: number; cumulativeRecovered: number };
      expect(data.recoveryAmount).toBe(100);
      expect(data.cumulativeRecovered).toBe(300);
      // Agregat harus dipanggil dengan tx (di dalam transaksi), bukan prisma.
      expect(tx.progressClaim.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ projectId: 'proj-1', status: 'CERTIFIED', id: { not: 'clm-1' } }) }),
      );
    });

    it('recovery dibatasi sisa DP (tidak melebihi)', async () => {
      primeClaim({ amount: 1000, advanceAmount: 1000, advanceRecoveryRate: 50 });
      tx.progressClaim.aggregate.mockResolvedValue({ _sum: { recoveryAmount: 950 } }); // sisa 50
      await service.certifyClaim('clm-1', dto({ certifiedAmount: 1000 }), 'user-1');

      const data = tx.progressClaim.updateMany.mock.calls[0][0].data as { recoveryAmount: number; cumulativeRecovered: number };
      expect(data.recoveryAmount).toBe(50); // terbatas sisa DP, bukan 500
      expect(data.cumulativeRecovered).toBe(1000);
    });

    it('DP sudah pulih penuh -> recovery 0, cumulative tetap = DP, tetap boleh sertifikasi', async () => {
      primeClaim({ amount: 1000, advanceAmount: 1000, advanceRecoveryRate: 10 });
      tx.progressClaim.aggregate.mockResolvedValue({ _sum: { recoveryAmount: 1000 } }); // sudah penuh
      await service.certifyClaim('clm-1', dto({ certifiedAmount: 1000 }), 'user-1');

      const data = tx.progressClaim.updateMany.mock.calls[0][0].data as { recoveryAmount: number; cumulativeRecovered: number };
      expect(data.recoveryAmount).toBe(0);
      expect(data.cumulativeRecovered).toBe(1000); // tidak pernah melebihi DP
    });

    it('data sudah over-recover (terkumpul > DP) -> ADVANCE_OVER_RECOVERED, tidak menulis', async () => {
      primeClaim({ amount: 1000, advanceAmount: 1000, advanceRecoveryRate: 10 });
      tx.progressClaim.aggregate.mockResolvedValue({ _sum: { recoveryAmount: 1200 } }); // rusak: > DP
      await expectCode(service.certifyClaim('clm-1', dto({ certifiedAmount: 100 }), 'user-1'), 'ADVANCE_OVER_RECOVERED');
      expect(tx.progressClaim.updateMany).not.toHaveBeenCalled();
    });
  });

  it('CAS kalah (sudah disertifikasi pihak lain) -> NOT_DRAFT', async () => {
    primeClaim();
    tx.progressClaim.updateMany.mockResolvedValue({ count: 0 });
    await expectCode(service.certifyClaim('clm-1', dto(), 'user-1'), 'NOT_DRAFT');
  });

  it('audit dicatat setelah transaksi selesai (bukan di dalamnya)', async () => {
    primeClaim();
    await service.certifyClaim('clm-1', dto(), 'user-1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ProgressClaim.CERTIFY', resource: 'ProgressClaim' }),
    );
    expect(cache.del).toHaveBeenCalled();
  });
});
