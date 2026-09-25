import { GlHelper } from './gl.helper';

describe('GlHelper', () => {
  let helper: GlHelper;
  const audit = { record: jest.fn() };

  /** tx tiruan: helper WAJIB menulis lewat tx ini, bukan membuka transaksi sendiri. */
  const makeTx = () => ({
    chartOfAccount: { findFirst: jest.fn() },
    numberSequence: { upsert: jest.fn().mockResolvedValue({ prefix: 'JRN-2026-EPC-', nextNumber: 2 }) },
    journal: { create: jest.fn().mockResolvedValue({ id: 'j-1', journalNumber: 'JRN-2026-EPC-000001' }) },
    // null = periode terbuka; test khusus kunci periode menimpanya.
    periodClose: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    helper = new GlHelper(audit as never);
  });

  describe('generateJournalNumber', () => {
    it('format prefix + padded (nextNumber - 1)', async () => {
      const tx = { numberSequence: { upsert: jest.fn().mockResolvedValue({ prefix: 'JRN-2026-EPC-', nextNumber: 42 }) } };
      const seq = await helper.generateJournalNumber(tx as never);
      expect(seq).toBe('JRN-2026-EPC-000041');
      expect(tx.numberSequence.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { code: 'JRN' } }),
      );
    });
  });

  describe('postInvoiceJournal', () => {
    const invoice = { id: 'inv-1', invoiceNumber: 'V-001', legalEntityId: 'ent-1', totalAmount: 111, amount: 100, taxAmount: 11 };

    it('akun AP tidak ada -> GL_ACCOUNT_MISSING (bukan null) dan tidak ada journal', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst.mockResolvedValueOnce(null);

      await expect(helper.postInvoiceJournal(tx as never, invoice, 'user-1')).rejects.toMatchObject({
        response: { code: 'GL_ACCOUNT_MISSING' },
      });
      expect(tx.journal.create).not.toHaveBeenCalled();
    });

    it('akun expense tidak ada -> GL_ACCOUNT_MISSING', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst
        .mockResolvedValueOnce({ id: 'ap' })
        .mockResolvedValueOnce(null);

      await expect(helper.postInvoiceJournal(tx as never, invoice, 'user-1')).rejects.toMatchObject({
        response: { code: 'GL_ACCOUNT_MISSING' },
      });
      expect(tx.journal.create).not.toHaveBeenCalled();
    });

    it('hanya mencari akun AKTIF (isActive: true)', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst.mockResolvedValue({ id: 'acc' });

      await helper.postInvoiceJournal(tx as never, invoice, 'user-1');

      expect(tx.chartOfAccount.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
      );
    });

    it('dengan PPN -> 3 line (expense D, VAT D, AP C), balance', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst
        .mockResolvedValueOnce({ id: 'ap' })       // 210
        .mockResolvedValueOnce({ id: 'expense' })  // 610
        .mockResolvedValueOnce({ id: 'vat' });     // 151

      await helper.postInvoiceJournal(tx as never, invoice, 'user-1');

      const lines = tx.journal.create.mock.calls[0][0].data.lines.create as Array<{ debit: number; credit: number }>;
      expect(lines).toHaveLength(3);
      expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(111);
      expect(lines.reduce((s, l) => s + l.credit, 0)).toBe(111);
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'Journal.AUTO_POST', resource: 'Journal' }));
    });

    it('tanpa PPN -> 2 line, balance', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst
        .mockResolvedValueOnce({ id: 'ap' })
        .mockResolvedValueOnce({ id: 'expense' });

      await helper.postInvoiceJournal(tx as never, { ...invoice, totalAmount: 100, taxAmount: null }, 'user-1');

      const lines = tx.journal.create.mock.calls[0][0].data.lines.create as Array<{ debit: number; credit: number }>;
      expect(lines).toHaveLength(2);
      expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(lines.reduce((s, l) => s + l.credit, 0));
    });

    it('PPN tanpa akun 151 -> PPN dibebankan ke expense (tetap balance)', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst
        .mockResolvedValueOnce({ id: 'ap' })
        .mockResolvedValueOnce({ id: 'expense' })
        .mockResolvedValueOnce(null); // 151 tidak ada

      await helper.postInvoiceJournal(tx as never, invoice, 'user-1');

      const lines = tx.journal.create.mock.calls[0][0].data.lines.create as Array<{ debit: number; credit: number }>;
      expect(lines).toHaveLength(3);
      expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(111);
      expect(lines.reduce((s, l) => s + l.credit, 0)).toBe(111);
    });

    it('TIDAK membuka transaksi sendiri (menulis lewat tx pemanggil)', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst.mockResolvedValue({ id: 'acc' });

      await helper.postInvoiceJournal(tx as never, invoice, 'user-1');

      expect(tx.$transaction).not.toHaveBeenCalled();
      expect(tx.journal.create).toHaveBeenCalledTimes(1);
    });

    it('periode LOCKED -> Conflict PERIOD_LOCKED, tidak ada journal', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst.mockResolvedValue({ id: 'acc' });
      tx.periodClose.findUnique.mockResolvedValue({ status: 'LOCKED' });

      await expect(helper.postInvoiceJournal(tx as never, invoice, 'user-1')).rejects.toMatchObject({
        response: { code: 'PERIOD_LOCKED' },
      });
      expect(tx.journal.create).not.toHaveBeenCalled();
    });

    it('periode CLOSED -> Conflict PERIOD_CLOSED, tidak ada journal', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst.mockResolvedValue({ id: 'acc' });
      tx.periodClose.findUnique.mockResolvedValue({ status: 'CLOSED' });

      await expect(helper.postInvoiceJournal(tx as never, invoice, 'user-1')).rejects.toMatchObject({
        response: { code: 'PERIOD_CLOSED' },
      });
      expect(tx.journal.create).not.toHaveBeenCalled();
    });
  });

  describe('postPaymentJournal', () => {
    const payment = { id: 'p-1', paymentNumber: 'PAY-1', legalEntityId: 'ent-1', totalAmount: 50 };

    it('akun kas tidak ada -> GL_ACCOUNT_MISSING', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst.mockResolvedValueOnce({ id: 'ap' }).mockResolvedValueOnce(null);

      await expect(helper.postPaymentJournal(tx as never, payment, 'user-1')).rejects.toMatchObject({
        response: { code: 'GL_ACCOUNT_MISSING' },
      });
      expect(tx.journal.create).not.toHaveBeenCalled();
    });

    it('valid -> AP D, Kas C (balance)', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst.mockResolvedValueOnce({ id: 'ap' }).mockResolvedValueOnce({ id: 'cash' });

      await helper.postPaymentJournal(tx as never, payment, 'user-1');

      const lines = tx.journal.create.mock.calls[0][0].data.lines.create as Array<{ debit: number; credit: number }>;
      expect(lines).toHaveLength(2);
      expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(50);
      expect(lines.reduce((s, l) => s + l.credit, 0)).toBe(50);
    });
  });

  describe('postClientInvoiceJournal', () => {
    const ci = { id: 'ci-1', invoiceNumber: 'CINV-1', legalEntityId: 'ent-1', amount: 100, taxAmount: null, totalAmount: 100 };

    it('AR tidak ada -> GL_ACCOUNT_MISSING', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst.mockResolvedValueOnce(null);

      await expect(helper.postClientInvoiceJournal(tx as never, ci, 'user-1')).rejects.toMatchObject({
        response: { code: 'GL_ACCOUNT_MISSING' },
      });
      expect(tx.journal.create).not.toHaveBeenCalled();
    });

    it('dengan PPN keluaran -> AR D, revenue C, VAT C (balance)', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst
        .mockResolvedValueOnce({ id: 'ar' })
        .mockResolvedValueOnce({ id: 'rev' })
        .mockResolvedValueOnce({ id: 'vatout' });

      await helper.postClientInvoiceJournal(tx as never, { ...ci, taxAmount: 11, totalAmount: 111 }, 'user-1');

      const lines = tx.journal.create.mock.calls[0][0].data.lines.create as Array<{ debit: number; credit: number }>;
      expect(lines).toHaveLength(3);
      expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(111);
      expect(lines.reduce((s, l) => s + l.credit, 0)).toBe(111);
    });
  });

  describe('postCollectionJournal', () => {
    const collection = { id: 'c-1', collectionNumber: 'COL-1', legalEntityId: 'ent-1', totalAmount: 80 };

    it('AR tidak ada -> GL_ACCOUNT_MISSING', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst.mockResolvedValueOnce({ id: 'cash' }).mockResolvedValueOnce(null);

      await expect(helper.postCollectionJournal(tx as never, collection, 'user-1')).rejects.toMatchObject({
        response: { code: 'GL_ACCOUNT_MISSING' },
      });
      expect(tx.journal.create).not.toHaveBeenCalled();
    });

    it('valid -> Kas D, AR C (balance)', async () => {
      const tx = makeTx();
      tx.chartOfAccount.findFirst.mockResolvedValueOnce({ id: 'cash' }).mockResolvedValueOnce({ id: 'ar' });

      await helper.postCollectionJournal(tx as never, collection, 'user-1');

      const lines = tx.journal.create.mock.calls[0][0].data.lines.create as Array<{ debit: number; credit: number }>;
      expect(lines).toHaveLength(2);
      expect(lines.reduce((s, l) => s + l.debit, 0)).toBe(80);
      expect(lines.reduce((s, l) => s + l.credit, 0)).toBe(80);
    });
  });
});
