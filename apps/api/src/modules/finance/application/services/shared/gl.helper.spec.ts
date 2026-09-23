import { GlHelper } from './gl.helper';

describe('GlHelper', () => {
  let helper: GlHelper;
  const audit = { record: jest.fn() };

  interface PrismaMock {
    chartOfAccount: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      chartOfAccount: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    helper = new GlHelper(prisma as never, audit as never);
  });

  describe('generateJournalNumber', () => {
    it('format prefix + padded (nextNumber - 1)', async () => {
      const tx = {
        numberSequence: { upsert: jest.fn().mockResolvedValue({ prefix: 'JRN-2026-EPC-', nextNumber: 42 }) },
      };
      const seq = await helper.generateJournalNumber(tx as never);
      expect(seq).toBe('JRN-2026-EPC-000041');
      expect(tx.numberSequence.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { code: 'JRN' } }),
      );
    });
  });

  describe('postInvoiceJournal', () => {
    const invoice = { id: 'inv-1', invoiceNumber: 'V-001', legalEntityId: 'ent-1', totalAmount: 111, amount: 100, taxAmount: 11 };

    it('akun AP/expense tidak ada -> null, tidak buat journal', async () => {
      prisma.chartOfAccount.findFirst.mockResolvedValue(null);
      const res = await helper.postInvoiceJournal(invoice, 'user-1');
      expect(res).toBeNull();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('dengan PPN -> 3 line (expense D, VAT D, AP C), balance', async () => {
      prisma.chartOfAccount.findFirst
        .mockResolvedValueOnce({ id: 'ap' })       // 210
        .mockResolvedValueOnce({ id: 'expense' })  // 610
        .mockResolvedValueOnce({ id: 'vat' });     // 151

      const tx = { journal: { create: jest.fn().mockResolvedValue({ id: 'j-1', journalNumber: 'JRN-1' }) }, numberSequence: { upsert: jest.fn().mockResolvedValue({ prefix: 'JRN-', nextNumber: 2 }) } };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      await helper.postInvoiceJournal(invoice, 'user-1');

      const lines = tx.journal.create.mock.calls[0][0].data.lines.create as Array<{ debit: number; credit: number }>;
      expect(lines).toHaveLength(3);
      expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(111);
      expect(lines.reduce((s, l) => s + l.credit, 0)).toBe(111);
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'Journal.AUTO_POST', resource: 'Journal' }));
    });

    it('tanpa PPN -> 2 line, balance', async () => {
      prisma.chartOfAccount.findFirst
        .mockResolvedValueOnce({ id: 'ap' })
        .mockResolvedValueOnce({ id: 'expense' });

      const tx = { journal: { create: jest.fn().mockResolvedValue({ id: 'j-1', journalNumber: 'JRN-1' }) }, numberSequence: { upsert: jest.fn().mockResolvedValue({ prefix: 'JRN-', nextNumber: 2 }) } };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      await helper.postInvoiceJournal({ ...invoice, totalAmount: 100, taxAmount: null }, 'user-1');

      const lines = tx.journal.create.mock.calls[0][0].data.lines.create as Array<{ debit: number; credit: number }>;
      expect(lines).toHaveLength(2);
      expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(lines.reduce((s, l) => s + l.credit, 0));
    });
  });

  describe('postPaymentJournal', () => {
    it('akun kas tidak ada -> null', async () => {
      prisma.chartOfAccount.findFirst.mockResolvedValueOnce({ id: 'ap' }).mockResolvedValueOnce(null);
      const res = await helper.postPaymentJournal({ id: 'p-1', paymentNumber: 'PAY-1', legalEntityId: 'ent-1', totalAmount: 50 }, 'user-1');
      expect(res).toBeNull();
    });

    it('valid -> AP D, Kas C (balance)', async () => {
      prisma.chartOfAccount.findFirst.mockResolvedValueOnce({ id: 'ap' }).mockResolvedValueOnce({ id: 'cash' });
      const tx = { journal: { create: jest.fn().mockResolvedValue({ id: 'j-2', journalNumber: 'JRN-2' }) }, numberSequence: { upsert: jest.fn().mockResolvedValue({ prefix: 'JRN-', nextNumber: 2 }) } };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      await helper.postPaymentJournal({ id: 'p-1', paymentNumber: 'PAY-1', legalEntityId: 'ent-1', totalAmount: 50 }, 'user-1');

      const lines = tx.journal.create.mock.calls[0][0].data.lines.create as Array<{ debit: number; credit: number }>;
      expect(lines).toHaveLength(2);
      expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(50);
      expect(lines.reduce((s, l) => s + l.credit, 0)).toBe(50);
    });
  });

  describe('postClientInvoiceJournal', () => {
    it('AR/revenue tidak ada -> null', async () => {
      prisma.chartOfAccount.findFirst.mockResolvedValueOnce(null);
      const res = await helper.postClientInvoiceJournal({ id: 'ci-1', invoiceNumber: 'CINV-1', legalEntityId: 'ent-1', amount: 100, taxAmount: null, totalAmount: 100 }, 'user-1');
      expect(res).toBeNull();
    });

    it('dengan PPN keluaran -> AR D, revenue C, VAT C (balance)', async () => {
      prisma.chartOfAccount.findFirst
        .mockResolvedValueOnce({ id: 'ar' })
        .mockResolvedValueOnce({ id: 'rev' })
        .mockResolvedValueOnce({ id: 'vatout' });
      const tx = { journal: { create: jest.fn().mockResolvedValue({ id: 'j-3', journalNumber: 'JRN-3' }) }, numberSequence: { upsert: jest.fn().mockResolvedValue({ prefix: 'JRN-', nextNumber: 2 }) } };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      await helper.postClientInvoiceJournal({ id: 'ci-1', invoiceNumber: 'CINV-1', legalEntityId: 'ent-1', amount: 100, taxAmount: 11, totalAmount: 111 }, 'user-1');

      const lines = tx.journal.create.mock.calls[0][0].data.lines.create as Array<{ debit: number; credit: number }>;
      expect(lines).toHaveLength(3);
      expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(111);
      expect(lines.reduce((s, l) => s + l.credit, 0)).toBe(111);
    });
  });

  describe('postCollectionJournal', () => {
    it('kas/AR tidak ada -> null', async () => {
      prisma.chartOfAccount.findFirst.mockResolvedValueOnce(null);
      const res = await helper.postCollectionJournal({ id: 'c-1', collectionNumber: 'COL-1', legalEntityId: 'ent-1', totalAmount: 80 }, 'user-1');
      expect(res).toBeNull();
    });

    it('valid -> Kas D, AR C (balance)', async () => {
      prisma.chartOfAccount.findFirst.mockResolvedValueOnce({ id: 'cash' }).mockResolvedValueOnce({ id: 'ar' });
      const tx = { journal: { create: jest.fn().mockResolvedValue({ id: 'j-4', journalNumber: 'JRN-4' }) }, numberSequence: { upsert: jest.fn().mockResolvedValue({ prefix: 'JRN-', nextNumber: 2 }) } };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      await helper.postCollectionJournal({ id: 'c-1', collectionNumber: 'COL-1', legalEntityId: 'ent-1', totalAmount: 80 }, 'user-1');

      const lines = tx.journal.create.mock.calls[0][0].data.lines.create as Array<{ debit: number; credit: number }>;
      expect(lines).toHaveLength(2);
      expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(80);
      expect(lines.reduce((s, l) => s + l.credit, 0)).toBe(80);
    });
  });
});
