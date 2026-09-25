import { PaymentService } from './payment.service';
import type { CreatePaymentDto } from '../../presentation/dto/finance.dto';

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

describe('PaymentService', () => {
  let service: PaymentService;
  const audit = { record: jest.fn() };
  const gl = { postPaymentJournal: jest.fn() };
  const cache = { del: jest.fn() };

  interface PrismaMock {
    project: { findUnique: jest.Mock };
    vendorInvoice: { findMany: jest.Mock };
    paymentItem: { groupBy: jest.Mock };
    payment: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;

  /** tx tiruan untuk approvePayment (baca saldo + CAS dalam satu transaksi). */
  const makeApproveTx = () => ({
    vendorInvoice: { findMany: jest.fn() },
    paymentItem: { groupBy: jest.fn() },
    payment: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'pay-1', status: 'APPROVED' }),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      project: { findUnique: jest.fn() },
      vendorInvoice: { findMany: jest.fn() },
      paymentItem: { groupBy: jest.fn() },
      payment: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new PaymentService(prisma as never, audit as never, gl as never, cache as never);
  });

  const dto = (over: Partial<CreatePaymentDto> = {}): CreatePaymentDto => ({
    projectId: 'proj-1',
    vendor: 'PT Baja Utama',
    items: [{ invoiceId: 'inv-1', amount: 100 }],
    ...over,
  });

  const invoice = {
    id: 'inv-1',
    invoiceNumber: 'V-001',
    totalAmount: 500,
    status: 'POSTED',
    projectId: 'proj-1',
  };

  it('project tidak ditemukan -> NotFound PROJECT_NOT_FOUND', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expectCode(service.createPayment(dto(), 'user-1'), 'PROJECT_NOT_FOUND');
  });

  it('invoice bukan POSTED -> Conflict INVOICE_NOT_POSTED', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.vendorInvoice.findMany.mockResolvedValue([{ ...invoice, status: 'DRAFT' }]);
    prisma.paymentItem.groupBy.mockResolvedValue([]);
    await expectCode(service.createPayment(dto(), 'user-1'), 'INVOICE_NOT_POSTED');
  });

  it('invoice beda project -> Conflict INVOICE_PROJECT_MISMATCH', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.vendorInvoice.findMany.mockResolvedValue([{ ...invoice, projectId: 'proj-2' }]);
    prisma.paymentItem.groupBy.mockResolvedValue([]);
    await expectCode(service.createPayment(dto(), 'user-1'), 'INVOICE_PROJECT_MISMATCH');
  });

  it('bayar melebihi AP open -> Conflict EXCEED_AP_OPEN', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.vendorInvoice.findMany.mockResolvedValue([invoice]);

    prisma.paymentItem.groupBy.mockResolvedValue([{ invoiceId: 'inv-1', _sum: { amount: 450 } }]);
    await expectCode(service.createPayment(dto(), 'user-1'), 'EXCEED_AP_OPEN');
  });

  it('valid -> satu transaksi atomic (upsert seq + create), audit tercatat', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.vendorInvoice.findMany.mockResolvedValue([invoice]);
    prisma.paymentItem.groupBy.mockResolvedValue([]);

    const tx = {
      numberSequence: {
        upsert: jest.fn().mockResolvedValue({
          prefix: 'PAY-2026-EPC-',
          nextNumber: 123,
        }),
      },
      payment: {
        create: jest.fn().mockResolvedValue({
          id: 'pay-1',
          paymentNumber: 'PAY-2026-EPC-000122',
          items: [{ invoiceId: 'inv-1', amount: 100 }],
        }),
      },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx)); // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await service.createPayment(dto(), 'user-1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.numberSequence.upsert).toHaveBeenCalled();
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentNumber: 'PAY-2026-EPC-000122',
          totalAmount: 100,
          vendor: 'PT Baja Utama',
        }),
      }),
    );
    expect(result.id).toBe('pay-1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Payment.CREATE', resource: 'Payment' }),
    );
  });

  it('dua baris invoice SAMA yang totalnya melebihi open -> EXCEED_AP_OPEN', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.vendorInvoice.findMany.mockResolvedValue([invoice]); // totalAmount 500
    prisma.paymentItem.groupBy.mockResolvedValue([]); // open = 500

    // Tiap baris (300) masih di bawah open, tetapi totalnya 600 > 500.
    // Tanpa agregasi per invoice, keduanya lolos dan AP kelebihan bayar.
    await expectCode(
      service.createPayment(
        dto({
          items: [
            { invoiceId: 'inv-1', amount: 300 },
            { invoiceId: 'inv-1', amount: 300 },
          ],
        }),
        'user-1',
      ),
      'EXCEED_AP_OPEN',
    );
  });

  it('dua baris invoice sama dalam batas open -> SATU item dengan amount gabungan', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.vendorInvoice.findMany.mockResolvedValue([invoice]);
    prisma.paymentItem.groupBy.mockResolvedValue([]);

    const tx = {
      numberSequence: { upsert: jest.fn().mockResolvedValue({ prefix: 'PAY-2026-EPC-', nextNumber: 2 }) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'pay-2', paymentNumber: 'PAY-2026-EPC-000001', items: [] }) },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx)); // eslint-disable-line @typescript-eslint/no-explicit-any

    await service.createPayment(
      dto({
        items: [
          { invoiceId: 'inv-1', amount: 200 },
          { invoiceId: 'inv-1', amount: 150 },
        ],
      }),
      'user-1',
    );

    const data = tx.payment.create.mock.calls[0][0].data as { totalAmount: number; items: { create: unknown[] } };
    expect(data.totalAmount).toBe(350);
    expect(data.items.create).toEqual([{ invoiceId: 'inv-1', amount: 350 }]);
  });

  describe('approvePayment (penjaga AP yang mengikat — D1)', () => {
    const draftPayment = {
      id: 'pay-1',
      paymentNumber: 'PAY-2026-EPC-000001',
      status: 'DRAFT',
      totalAmount: 80,
      projectId: 'proj-1',
      items: [{ invoiceId: 'inv-1', amount: 80 }],
      project: { id: 'proj-1' },
    };

    const primeApprove = (opts: { committedCents: number; invoiceTotal?: number; status?: string; projectId?: string }) => {
      prisma.payment.findUnique.mockResolvedValue(draftPayment);
      const tx = makeApproveTx();
      tx.vendorInvoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'V-001',
          totalAmount: opts.invoiceTotal ?? 100,
          status: opts.status ?? 'POSTED',
          projectId: opts.projectId ?? 'proj-1',
        },
      ]);
      tx.paymentItem.groupBy.mockResolvedValue(
        opts.committedCents > 0 ? [{ invoiceId: 'inv-1', _sum: { amount: opts.committedCents / 100 } }] : [],
      );
      prisma.$transaction.mockImplementation((cb: any) => cb(tx)); // eslint-disable-line @typescript-eslint/no-explicit-any
      return tx;
    };

    it('payment tidak ditemukan -> NotFound PAYMENT_NOT_FOUND', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expectCode(service.approvePayment('pay-1', 'user-1'), 'PAYMENT_NOT_FOUND');
    });

    it('bukan DRAFT -> Conflict NOT_DRAFT', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...draftPayment, status: 'APPROVED' });
      await expectCode(service.approvePayment('pay-1', 'user-1'), 'NOT_DRAFT');
    });

    it('open masih cukup -> APPROVED, CAS dipanggil, audit tercatat', async () => {
      const tx = primeApprove({ committedCents: 0 });

      const result = await service.approvePayment('pay-1', 'user-1');

      expect(result.status).toBe('APPROVED');
      expect(tx.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pay-1', status: 'DRAFT' } }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'Payment.APPROVE', resource: 'Payment' }),
      );
    });

    it('alokasi lain sudah mengikat sisa saldo -> Conflict EXCEED_AP_OPEN', async () => {
      // Invoice 100; sudah ada payment APPROVED 80. Approval 80 berikutnya harus ditolak.
      // Inilah celah yang ditutup D1: pada DRAFT keduanya sama-sama lolos di create.
      primeApprove({ committedCents: 8000, invoiceTotal: 100 });

      await expectCode(service.approvePayment('pay-1', 'user-1'), 'EXCEED_AP_OPEN');
    });

    it('total tepat sama dengan sisa saldo -> boleh (batas presisi sen)', async () => {
      // Invoice 100; sudah mengikat 20; sisa 80 -> approval 80 diterima.
      primeApprove({ committedCents: 2000, invoiceTotal: 100 });
      const result = await service.approvePayment('pay-1', 'user-1');
      expect(result.status).toBe('APPROVED');
    });

    it('invoice sudah tidak POSTED -> Conflict INVOICE_NOT_POSTED', async () => {
      primeApprove({ committedCents: 0, status: 'MATCHED' });
      await expectCode(service.approvePayment('pay-1', 'user-1'), 'INVOICE_NOT_POSTED');
    });

    it('invoice beda project -> Conflict INVOICE_PROJECT_MISMATCH', async () => {
      primeApprove({ committedCents: 0, projectId: 'proj-2' });
      await expectCode(service.approvePayment('pay-1', 'user-1'), 'INVOICE_PROJECT_MISMATCH');
    });

    it('CAS kalah (sudah di-approve pihak lain) -> Conflict NOT_DRAFT', async () => {
      const tx = primeApprove({ committedCents: 0 });
      tx.payment.updateMany.mockResolvedValue({ count: 0 });
      await expectCode(service.approvePayment('pay-1', 'user-1'), 'NOT_DRAFT');
    });
  });
});
