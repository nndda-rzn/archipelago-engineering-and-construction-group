import { PeriodCloseService } from './period-close.service';
import { periodRange } from '@/shared/utils/period';
import type { CreatePeriodCloseDto } from '../../presentation/dto/finance-closure.dto';

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

describe('PeriodCloseService', () => {
  let service: PeriodCloseService;
  const audit = { record: jest.fn() };

  interface PrismaMock {
    legalEntity: { findUnique: jest.Mock };
    journal: { count: jest.Mock };
    periodClose: { findUnique: jest.Mock; create: jest.Mock; updateMany: jest.Mock; findUniqueOrThrow: jest.Mock };
  }
  let prisma: PrismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      legalEntity: { findUnique: jest.fn() },
      journal: { count: jest.fn().mockResolvedValue(0) },
      periodClose: {
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'pc-1', status: 'CLOSED' }),
      },
    };
    service = new PeriodCloseService(prisma as never, audit as never);
  });

  const dto = (over: Partial<CreatePeriodCloseDto> = {}): CreatePeriodCloseDto => ({
    legalEntityId: 'ent-1',
    period: '2026-08',
    ...over,
  });

  describe('startPeriodClose', () => {
    it('legal entity tidak ada -> ENTITY_NOT_FOUND', async () => {
      prisma.legalEntity.findUnique.mockResolvedValue(null);
      await expectCode(service.startPeriodClose(dto(), 'user-1'), 'ENTITY_NOT_FOUND');
    });

    it('periode sudah dibuka -> PERIOD_ALREADY_OPENED', async () => {
      prisma.legalEntity.findUnique.mockResolvedValue({ id: 'ent-1', code: 'AEC-CON' });
      prisma.periodClose.findUnique.mockResolvedValue({ id: 'pc-1' });
      await expectCode(service.startPeriodClose(dto(), 'user-1'), 'PERIOD_ALREADY_OPENED');
    });

    it('format periode salah -> INVALID_PERIOD', async () => {
      prisma.legalEntity.findUnique.mockResolvedValue({ id: 'ent-1', code: 'AEC-CON' });
      await expectCode(service.startPeriodClose(dto({ period: '2026/08' }), 'user-1'), 'INVALID_PERIOD');
    });

    it('journalCount dihitung HANYA dalam rentang periode', async () => {
      prisma.legalEntity.findUnique.mockResolvedValue({ id: 'ent-1', code: 'AEC-CON' });
      prisma.periodClose.findUnique.mockResolvedValue(null);
      prisma.journal.count.mockResolvedValue(7);
      prisma.periodClose.create.mockResolvedValue({ id: 'pc-1', journalCount: 7 });

      await service.startPeriodClose(dto(), 'user-1');

      expect(prisma.journal.count).toHaveBeenCalledWith({
        where: { legalEntityId: 'ent-1', status: 'POSTED', date: periodRange('2026-08') },
      });
    });
  });

  describe('closePeriod', () => {
    const primeInProgress = () => {
      prisma.periodClose.findUnique.mockResolvedValue({
        id: 'pc-1', legalEntityId: 'ent-1', period: '2026-08', status: 'IN_PROGRESS',
        steps: { cutoff: true, accrual: true, depreciation: true, revaluation: true, reconciliation: true, closing: true },
      });
    };

    it('status bukan IN_PROGRESS -> NOT_IN_PROGRESS', async () => {
      prisma.periodClose.findUnique.mockResolvedValue({ id: 'pc-1', status: 'CLOSED', steps: {} });
      await expectCode(service.closePeriod('pc-1', 'user-1'), 'NOT_IN_PROGRESS');
    });

    it('ada step yang belum selesai -> STEPS_PENDING', async () => {
      prisma.periodClose.findUnique.mockResolvedValue({ id: 'pc-1', status: 'IN_PROGRESS', steps: { cutoff: true } });
      await expectCode(service.closePeriod('pc-1', 'user-1'), 'STEPS_PENDING');
    });

    it('draft di periode LAIN tidak memblokir; draft di periode INI memblokir', async () => {
      primeInProgress();
      // hitungan kedua (journalCount) 0; hitungan pertama (draft periode ini) 3
      prisma.journal.count.mockResolvedValueOnce(3).mockResolvedValueOnce(10);

      await expectCode(service.closePeriod('pc-1', 'user-1'), 'JOURNAL_DRAFT_PENDING');

      // Pastikan hitungan draft memakai rentang periode, bukan seluruh legal entity.
      expect(prisma.journal.count).toHaveBeenNthCalledWith(1, {
        where: { legalEntityId: 'ent-1', status: 'DRAFT', date: periodRange('2026-08') },
      });
    });

    it('valid -> CAS IN_PROGRESS -> CLOSED', async () => {
      primeInProgress();
      prisma.journal.count.mockResolvedValueOnce(0).mockResolvedValueOnce(5);

      const result = await service.closePeriod('pc-1', 'user-1');

      expect(prisma.periodClose.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pc-1', status: 'IN_PROGRESS' }, data: expect.objectContaining({ status: 'CLOSED', journalCount: 5 }) }),
      );
      expect(result.status).toBe('CLOSED');
    });

    it('CAS kalah (close paralel) -> NOT_IN_PROGRESS', async () => {
      primeInProgress();
      prisma.journal.count.mockResolvedValue(0);
      prisma.periodClose.updateMany.mockResolvedValue({ count: 0 });
      await expectCode(service.closePeriod('pc-1', 'user-1'), 'NOT_IN_PROGRESS');
    });
  });

  describe('lockPeriod', () => {
    it('status bukan CLOSED -> NOT_CLOSED', async () => {
      prisma.periodClose.findUnique.mockResolvedValue({ id: 'pc-1', status: 'IN_PROGRESS' });
      await expectCode(service.lockPeriod('pc-1', 'user-1'), 'NOT_CLOSED');
    });

    it('CLOSED -> CAS -> LOCKED', async () => {
      prisma.periodClose.findUnique.mockResolvedValue({ id: 'pc-1', period: '2026-08', status: 'CLOSED' });
      prisma.periodClose.findUniqueOrThrow.mockResolvedValue({ id: 'pc-1', status: 'LOCKED' });

      const result = await service.lockPeriod('pc-1', 'user-1');

      expect(prisma.periodClose.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pc-1', status: 'CLOSED' }, data: { status: 'LOCKED' } }),
      );
      expect(result.status).toBe('LOCKED');
    });

    it('CAS kalah (lock paralel) -> NOT_CLOSED', async () => {
      prisma.periodClose.findUnique.mockResolvedValue({ id: 'pc-1', period: '2026-08', status: 'CLOSED' });
      prisma.periodClose.updateMany.mockResolvedValue({ count: 0 });
      await expectCode(service.lockPeriod('pc-1', 'user-1'), 'NOT_CLOSED');
    });
  });
});
