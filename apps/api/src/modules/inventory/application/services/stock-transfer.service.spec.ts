import { StockTransferService } from './stock-transfer.service';
import type { CreateStockTransferDto } from '../../presentation/dto/inventory.dto';

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

describe('StockTransferService', () => {
  let service: StockTransferService;
  const audit = { record: jest.fn() };
  const ledger = { write: jest.fn() };

  interface PrismaMock {
    project: { findUnique: jest.Mock };
    warehouse: { findUnique: jest.Mock };
    wbsItem: { findMany: jest.Mock };
    stockLedgerEntry: { groupBy: jest.Mock };
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      project: { findUnique: jest.fn() },
      warehouse: { findUnique: jest.fn() },
      wbsItem: { findMany: jest.fn() },
      stockLedgerEntry: { groupBy: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new StockTransferService(prisma as never, audit as never, ledger as never);
  });

  const dto = (over: Partial<CreateStockTransferDto> = {}): CreateStockTransferDto => ({
    projectId: 'proj-1',
    fromWarehouseId: 'wh-a',
    toWarehouseId: 'wh-b',
    items: [{ description: 'Besi beton', quantity: 10 }],
    ...over,
  });

  const primeHappyPath = () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.warehouse.findUnique.mockResolvedValueOnce({ id: 'wh-a', code: 'WH-A' });
    prisma.warehouse.findUnique.mockResolvedValueOnce({ id: 'wh-b', code: 'WH-B' });
    prisma.stockLedgerEntry.groupBy.mockResolvedValue([{ projectId: 'proj-1', warehouseId: 'wh-a', wbsItemId: null, _sum: { quantity: 100 } }]);
  };

  it('warehouse asal == tujuan -> BadRequest SAME_WAREHOUSE', async () => {
    await expectCode(service.createStockTransfer(dto({ fromWarehouseId: 'wh-a', toWarehouseId: 'wh-a' }), 'user-1'), 'SAME_WAREHOUSE');
  });

  it('project tidak ditemukan -> NotFound PROJECT_NOT_FOUND', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expectCode(service.createStockTransfer(dto(), 'user-1'), 'PROJECT_NOT_FOUND');
  });

  it('warehouse tidak ditemukan -> NotFound WAREHOUSE_NOT_FOUND', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.warehouse.findUnique.mockResolvedValueOnce({ id: 'wh-a', code: 'WH-A' });
    prisma.warehouse.findUnique.mockResolvedValueOnce(null);
    await expectCode(service.createStockTransfer(dto(), 'user-1'), 'WAREHOUSE_NOT_FOUND');
  });

  it('WBS beda project -> NotFound WBS_NOT_FOUND', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.warehouse.findUnique.mockResolvedValueOnce({ id: 'wh-a', code: 'WH-A' });
    prisma.warehouse.findUnique.mockResolvedValueOnce({ id: 'wh-b', code: 'WH-B' });
    prisma.wbsItem.findMany.mockResolvedValue([{ id: 'wbs-1', projectId: 'proj-2' }]);
    await expectCode(service.createStockTransfer(dto({ items: [{ description: 'Besi', quantity: 1, wbsItemId: 'wbs-1' }] }), 'user-1'), 'WBS_NOT_FOUND');
  });

  it('stok tidak cukup -> Conflict INSUFFICIENT_STOCK', async () => {
    primeHappyPath();
    prisma.stockLedgerEntry.groupBy.mockResolvedValue([{ projectId: 'proj-1', warehouseId: 'wh-a', wbsItemId: null, _sum: { quantity: 5 } }]);
    await expectCode(service.createStockTransfer(dto({ items: [{ description: 'Besi', quantity: 10 }] }), 'user-1'), 'INSUFFICIENT_STOCK');
  });

  it('valid -> satu transaksi atomic (seq + create + ledger dalam tx), audit tercatat', async () => {
    primeHappyPath();

    const tx = {
      numberSequence: { upsert: jest.fn().mockResolvedValue({ prefix: 'ST-2026-EPC-', nextNumber: 7 }) },
      stockTransfer: {
        create: jest.fn().mockResolvedValue({
          id: 'st-1',
          transferNumber: 'ST-2026-EPC-000006',
          items: [{ id: 'item-1', quantity: 10, unit: 'EA', wbsItemId: null }],
        }),
      },
    };
    prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

    const result = await service.createStockTransfer(dto(), 'user-1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.numberSequence.upsert).toHaveBeenCalled();
    expect(tx.stockTransfer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ transferNumber: 'ST-2026-EPC-000006', fromWarehouseId: 'wh-a', toWarehouseId: 'wh-b' }),
      }),
    );
    // ledger di dalam transaksi yang sama: 2 baris per item (OUT + IN)
    expect(ledger.write).toHaveBeenCalledTimes(1);
    expect(ledger.write.mock.calls[0][0]).toBe(tx);
    expect(ledger.write.mock.calls[0][1]).toHaveLength(2);
    expect(result.id).toBe('st-1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'StockTransfer.CREATE', resource: 'StockTransfer' }));
  });
});
