import { JournalService } from './journal.service';
import type { CreateJournalDto } from '../../presentation/dto/finance.dto';

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

describe('JournalService', () => {
  let service: JournalService;
  const audit = { record: jest.fn() };
  const gl = { generateJournalNumber: jest.fn() };

  interface PrismaMock {
    legalEntity: { findUnique: jest.Mock };
    chartOfAccount: { findUnique: jest.Mock };
    journal: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      legalEntity: { findUnique: jest.fn() },
      chartOfAccount: { findUnique: jest.fn() },
      journal: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new JournalService(prisma as never, audit as never, gl as never);
  });

  const dto = (over: Partial<CreateJournalDto> = {}): CreateJournalDto => ({
    legalEntityId: 'ent-1',
    description: 'Jurnal umum',
    lines: [
      { accountId: 'acc-1', debit: 100, credit: 0 },
      { accountId: 'acc-2', debit: 0, credit: 100 },
    ],
    ...over,
  });

  const primeEntity = () => {
    prisma.legalEntity.findUnique.mockResolvedValue({ id: 'ent-1' });
  };

  it('legal entity tidak ada -> NotFound LEGAL_ENTITY_NOT_FOUND', async () => {
    prisma.legalEntity.findUnique.mockResolvedValue(null);
    await expectCode(service.createJournal(dto(), 'user-1'), 'LEGAL_ENTITY_NOT_FOUND');
  });

  it('akun tidak ada -> NotFound ACCOUNT_NOT_FOUND', async () => {
    primeEntity();
    prisma.chartOfAccount.findUnique.mockResolvedValue(null);
    await expectCode(service.createJournal(dto(), 'user-1'), 'ACCOUNT_NOT_FOUND');
  });

  it('akun non-aktif -> Conflict ACCOUNT_INACTIVE', async () => {
    primeEntity();
    prisma.chartOfAccount.findUnique.mockResolvedValue({ id: 'acc-1', code: '1100', isActive: false, legalEntityId: 'ent-1' });
    await expectCode(service.createJournal(dto(), 'user-1'), 'ACCOUNT_INACTIVE');
  });

  it('akun beda legal entity -> Conflict ACCOUNT_ENTITY_MISMATCH', async () => {
    primeEntity();
    prisma.chartOfAccount.findUnique.mockResolvedValue({ id: 'acc-1', code: '1100', isActive: true, legalEntityId: 'ent-2' });
    await expectCode(service.createJournal(dto(), 'user-1'), 'ACCOUNT_ENTITY_MISMATCH');
  });

  it('satu line dua sisi -> Conflict LINE_BOTH_SIDES', async () => {
    primeEntity();
    prisma.chartOfAccount.findUnique.mockResolvedValue({ id: 'acc-1', code: '1100', isActive: true, legalEntityId: 'ent-1' });
    await expectCode(service.createJournal(dto({ lines: [{ accountId: 'acc-1', debit: 10, credit: 10 }] }), 'user-1'), 'LINE_BOTH_SIDES');
  });

  it('satu line nol -> Conflict LINE_ZERO', async () => {
    primeEntity();
    prisma.chartOfAccount.findUnique.mockResolvedValue({ id: 'acc-1', code: '1100', isActive: true, legalEntityId: 'ent-1' });
    await expectCode(service.createJournal(dto({ lines: [{ accountId: 'acc-1', debit: 0, credit: 0 }] }), 'user-1'), 'LINE_ZERO');
  });

  it('debit != credit -> Conflict UNBALANCED_JOURNAL', async () => {
    primeEntity();
    prisma.chartOfAccount.findUnique.mockResolvedValue({ id: 'acc-1', code: '1100', isActive: true, legalEntityId: 'ent-1' });
    const unbalanced = dto({ lines: [{ accountId: 'acc-1', debit: 100, credit: 0 }, { accountId: 'acc-2', debit: 0, credit: 50 }] });
    await expectCode(service.createJournal(unbalanced, 'user-1'), 'UNBALANCED_JOURNAL');
  });

  it('valid -> journal.create dalam tx dengan nomor dari gl.generateJournalNumber', async () => {
    primeEntity();
    prisma.chartOfAccount.findUnique.mockResolvedValue({ id: 'acc-1', code: '1100', isActive: true, legalEntityId: 'ent-1' });
    gl.generateJournalNumber.mockResolvedValue('JRN-2026-EPC-000001');

    const tx = { journal: { create: jest.fn().mockResolvedValue({ id: 'j-1', journalNumber: 'JRN-2026-EPC-000001' }) } };
    prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

    const result = await service.createJournal(dto(), 'user-1');

    expect(gl.generateJournalNumber).toHaveBeenCalledTimes(1);
    expect(tx.journal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ journalNumber: 'JRN-2026-EPC-000001', legalEntityId: 'ent-1' }) }),
    );
    expect(result.id).toBe('j-1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'Journal.CREATE', resource: 'Journal' }));
  });

  describe('postJournal', () => {
    it('status bukan DRAFT -> Conflict NOT_DRAFT', async () => {
      prisma.journal.findUnique.mockResolvedValue({ id: 'j-1', status: 'POSTED', lines: [] });
      await expectCode(service.postJournal('j-1', 'user-1'), 'NOT_DRAFT');
    });

    it('unbalanced -> Conflict UNBALANCED_JOURNAL', async () => {
      prisma.journal.findUnique.mockResolvedValue({ id: 'j-1', status: 'DRAFT', lines: [{ debit: 100, credit: 0 }, { debit: 0, credit: 50 }] });
      await expectCode(service.postJournal('j-1', 'user-1'), 'UNBALANCED_JOURNAL');
    });

    it('valid DRAFT balanced -> status POSTED', async () => {
      prisma.journal.findUnique.mockResolvedValue({ id: 'j-1', journalNumber: 'JRN-1', status: 'DRAFT', lines: [{ debit: 100, credit: 0 }, { debit: 0, credit: 100 }] });
      prisma.journal.update.mockResolvedValue({ id: 'j-1', status: 'POSTED' });

      const result = await service.postJournal('j-1', 'user-1');

      expect(prisma.journal.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'j-1' }, data: expect.objectContaining({ status: 'POSTED' }) }));
      expect(result.status).toBe('POSTED');
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'Journal.POST' }));
    });
  });
});
