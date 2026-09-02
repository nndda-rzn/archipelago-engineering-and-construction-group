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

  interface PrismaMock {
    project: { findUnique: jest.Mock };
    vendorInvoice: { findMany: jest.Mock };
    paymentItem: { groupBy: jest.Mock };
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      project: { findUnique: jest.fn() },
      vendorInvoice: { findMany: jest.fn() },
      paymentItem: { groupBy: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new PaymentService(prisma as never, audit as never, gl as never);
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
});
