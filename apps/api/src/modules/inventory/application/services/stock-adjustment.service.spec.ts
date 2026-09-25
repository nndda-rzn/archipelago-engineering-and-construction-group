import { StockAdjustmentService } from './stock-adjustment.service';

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

describe('StockAdjustmentService.approveStockAdjustment', () => {
  let service: StockAdjustmentService;
  const audit = { record: jest.fn() };
  const ledger = { write: jest.fn() };

  interface TxMock {
    stockAdjustment: { findUnique: jest.Mock; update: jest.Mock };
    stockLedgerEntry: { groupBy: jest.Mock };
  }
  interface PrismaMock {
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;
  let tx: TxMock;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      stockAdjustment: { findUnique: jest.fn(), update: jest.fn() },
      stockLedgerEntry: { groupBy: jest.fn() },
    };
    prisma = { $transaction: jest.fn((cb: (t: TxMock) => unknown) => cb(tx)) };
    service = new StockAdjustmentService(prisma as never, audit as never, ledger as never);
  });

  /** Siapkan adjustment DRAFT dengan item tertentu; `onHand` = saldo bucket 'wbs-1'. */
  const prime = (items: { description: string; quantity: number }[], onHand: number) => {
    const full = items.map((i, idx) => ({ id: `item-${idx + 1}`, wbsItemId: 'wbs-1', unit: 'EA', ...i }));
    tx.stockAdjustment.findUnique.mockResolvedValue({
      id: 'adj-1',
      adjustmentNumber: 'ADJ-2026-EPC-000001',
      status: 'DRAFT',
      projectId: 'proj-1',
      warehouseId: 'wh-a',
      reasonCode: 'LOSS',
      items: full,
    });
    tx.stockAdjustment.update.mockResolvedValue({
      id: 'adj-1',
      adjustmentNumber: 'ADJ-2026-EPC-000001',
      status: 'APPROVED',
      items: full,
    });
    tx.stockLedgerEntry.groupBy.mockResolvedValue([{ wbsItemId: 'wbs-1', _sum: { quantity: onHand } }]);
  };

  it('adjustment tidak ditemukan -> NotFound ADJUSTMENT_NOT_FOUND', async () => {
    tx.stockAdjustment.findUnique.mockResolvedValue(null);
    await expectCode(service.approveStockAdjustment('adj-1', 'user-1'), 'ADJUSTMENT_NOT_FOUND');
  });

  it('bukan DRAFT -> Conflict NOT_DRAFT', async () => {
    prime([{ description: 'Hilang', quantity: -1 }], 10);
    tx.stockAdjustment.findUnique.mockResolvedValue({
      id: 'adj-1', adjustmentNumber: 'ADJ-0001', status: 'APPROVED',
      projectId: 'proj-1', warehouseId: 'wh-a', reasonCode: 'LOSS', items: [],
    });
    await expectCode(service.approveStockAdjustment('adj-1', 'user-1'), 'NOT_DRAFT');
  });

  it('satu baris negatif melebihi stok -> Conflict INSUFFICIENT_STOCK', async () => {
    prime([{ description: 'Hilang', quantity: -11 }], 10);
    await expectCode(service.approveStockAdjustment('adj-1', 'user-1'), 'INSUFFICIENT_STOCK');
  });

  it('dua baris negatif pada bucket SAMA yang totalnya melebihi stok -> INSUFFICIENT_STOCK', async () => {
    // stok 10; dua baris -6 masing-masing. Tanpa agregasi per bucket keduanya lolos (-12).
    prime(
      [
        { description: 'Hilang A', quantity: -6 },
        { description: 'Hilang B', quantity: -6 },
      ],
      10,
    );
    await expectCode(service.approveStockAdjustment('adj-1', 'user-1'), 'INSUFFICIENT_STOCK');
  });

  it('penambahan pada dokumen yang sama TIDAK mengimbangi pengurangan (kebijakan konservatif)', async () => {
    // stok 2; item -6 dan +6. Bila di-netting, delta = 0 dan lolos. Dengan kebijakan
    // konservatif, pengurangan 6 > stok 2 -> ditolak.
    prime(
      [
        { description: 'Hilang', quantity: -6 },
        { description: 'Surplus', quantity: 6 },
      ],
      2,
    );
    await expectCode(service.approveStockAdjustment('adj-1', 'user-1'), 'INSUFFICIENT_STOCK');
  });

  it('dua baris negatif dengan total TEPAT sama dengan stok -> boleh, ledger 2 baris', async () => {
    prime(
      [
        { description: 'Hilang A', quantity: -6 },
        { description: 'Hilang B', quantity: -4 },
      ],
      10,
    );

    const result = await service.approveStockAdjustment('adj-1', 'user-1');

    expect(result.status).toBe('APPROVED');
    expect(tx.stockAdjustment.update).toHaveBeenCalled();
    expect(ledger.write).toHaveBeenCalledTimes(1);
    expect(ledger.write.mock.calls[0][0]).toBe(tx);
    expect(ledger.write.mock.calls[0][1]).toHaveLength(2);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'StockAdjustment.APPROVE', resource: 'StockAdjustment' }),
    );
  });

  it('adjustment positif saja -> tidak membaca saldo stok', async () => {
    prime([{ description: 'Surplus', quantity: 5 }], 0);

    await service.approveStockAdjustment('adj-1', 'user-1');

    expect(tx.stockLedgerEntry.groupBy).not.toHaveBeenCalled();
    expect(ledger.write).toHaveBeenCalledTimes(1);
  });
});
