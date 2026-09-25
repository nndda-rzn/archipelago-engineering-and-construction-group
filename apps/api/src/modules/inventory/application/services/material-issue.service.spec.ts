import { MaterialIssueService } from './material-issue.service';
import type { CreateMaterialIssueDto } from '../../presentation/dto/inventory.dto';

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

describe('MaterialIssueService', () => {
  let service: MaterialIssueService;
  const audit = { record: jest.fn() };
  const ledger = { write: jest.fn() };

  interface TxMock {
    numberSequence: { upsert: jest.Mock };
    stockLedgerEntry: { aggregate: jest.Mock };
    materialIssue: { create: jest.Mock };
  }
  interface PrismaMock {
    project: { findUnique: jest.Mock };
    warehouse: { findUnique: jest.Mock };
    wbsItem: { findMany: jest.Mock };
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;
  let tx: TxMock;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      numberSequence: { upsert: jest.fn().mockResolvedValue({ prefix: 'MI-2026-EPC-', nextNumber: 2 }) },
      stockLedgerEntry: { aggregate: jest.fn() },
      materialIssue: {
        create: jest.fn().mockImplementation((args: { data: { items: { create: unknown[] } } }) => ({
          id: 'mi-1',
          issueNumber: 'MI-2026-EPC-000001',
          items: args.data.items.create,
        })),
      },
    };
    prisma = {
      project: { findUnique: jest.fn() },
      warehouse: { findUnique: jest.fn() },
      wbsItem: { findMany: jest.fn() },
      // Dipakai dua kali: transaksi seq lalu transaksi Serializable (withSerializableRetry).
      $transaction: jest.fn((cb: (t: TxMock) => unknown) => cb(tx)),
    };
    service = new MaterialIssueService(prisma as never, audit as never, ledger as never);
  });

  const dto = (over: Partial<CreateMaterialIssueDto> = {}): CreateMaterialIssueDto => ({
    projectId: 'proj-1',
    warehouseId: 'wh-a',
    issuedTo: 'Tim Lapangan',
    items: [{ description: 'Besi beton', quantity: 5, wbsItemId: 'wbs-1' }],
    ...over,
  });

  const primeHappyPath = (onHand: number, totalValue: number) => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-a', code: 'WH-A', projectId: 'proj-1' });
    prisma.wbsItem.findMany.mockResolvedValue([{ id: 'wbs-1' }]);
    tx.stockLedgerEntry.aggregate.mockResolvedValue({ _sum: { quantity: onHand, totalValue } });
  };

  it('project tidak ditemukan -> NotFound PROJECT_NOT_FOUND', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expectCode(service.createMaterialIssue(dto(), 'user-1'), 'PROJECT_NOT_FOUND');
  });

  it('warehouse tidak ditemukan -> NotFound WAREHOUSE_NOT_FOUND', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.warehouse.findUnique.mockResolvedValue(null);
    await expectCode(service.createMaterialIssue(dto(), 'user-1'), 'WAREHOUSE_NOT_FOUND');
  });

  it('WBS beda project -> NotFound WBS_NOT_FOUND', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-a', code: 'WH-A', projectId: 'proj-1' });
    prisma.wbsItem.findMany.mockResolvedValue([]);
    await expectCode(service.createMaterialIssue(dto(), 'user-1'), 'WBS_NOT_FOUND');
  });

  it('satu baris melebihi stok -> Conflict INSUFFICIENT_STOCK', async () => {
    primeHappyPath(4, 400);
    await expectCode(service.createMaterialIssue(dto(), 'user-1'), 'INSUFFICIENT_STOCK');
  });

  it('dua baris pada bucket SAMA yang totalnya melebihi stok -> INSUFFICIENT_STOCK', async () => {
    // stok 10; dua baris 8 + 8. Tanpa agregasi per bucket, masing-masing 8 <= 10 lolos
    // dan saldo menjadi -6.
    primeHappyPath(10, 1000);

    await expectCode(
      service.createMaterialIssue(
        dto({
          items: [
            { description: 'Besi A', quantity: 8, wbsItemId: 'wbs-1' },
            { description: 'Besi B', quantity: 8, wbsItemId: 'wbs-1' },
          ],
        }),
        'user-1',
      ),
      'INSUFFICIENT_STOCK',
    );
  });

  it('dua baris bucket sama dengan total TEPAT sama dengan stok -> boleh', async () => {
    primeHappyPath(10, 1000);

    await service.createMaterialIssue(
      dto({
        items: [
          { description: 'Besi A', quantity: 5, wbsItemId: 'wbs-1' },
          { description: 'Besi B', quantity: 5, wbsItemId: 'wbs-1' },
        ],
      }),
      'user-1',
    );

    // Saldo dibaca sekali per bucket (bukan sekali per baris).
    expect(tx.stockLedgerEntry.aggregate).toHaveBeenCalledTimes(1);
    // Harga rata-rata tetap 1000/10 = 100 per unit.
    expect(tx.materialIssue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({ quantity: 5, unitPrice: 100, totalValue: 500 }),
              expect.objectContaining({ quantity: 5, unitPrice: 100, totalValue: 500 }),
            ],
          },
        }),
      }),
    );
    expect(ledger.write).toHaveBeenCalledTimes(1);
    expect(ledger.write.mock.calls[0][0]).toBe(tx);
    expect(ledger.write.mock.calls[0][1]).toHaveLength(2);
  });
});
