import { CollectionService } from './collection.service';
import type { CreateCollectionDto } from '../../presentation/dto/finance.dto';

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

describe('CollectionService', () => {
  let service: CollectionService;
  const audit = { record: jest.fn() };
  const gl = { postCollectionJournal: jest.fn() };
  const cache = { del: jest.fn() };

  interface PrismaMock {
    project: { findUnique: jest.Mock };
    clientInvoice: { findMany: jest.Mock };
    collectionItem: { groupBy: jest.Mock };
    collection: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      project: { findUnique: jest.fn() },
      clientInvoice: { findMany: jest.fn() },
      collectionItem: { groupBy: jest.fn() },
      collection: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new CollectionService(prisma as never, audit as never, gl as never, cache as never);
  });

  const dto = (over: Partial<CreateCollectionDto> = {}): CreateCollectionDto => ({
    projectId: 'proj-1',
    client: 'PT Klien Utama',
    items: [{ clientInvoiceId: 'cinv-1', amount: 100 }],
    ...over,
  });

  const invoice = {
    id: 'cinv-1',
    invoiceNumber: 'CINV-0001',
    totalAmount: 500,
    status: 'POSTED',
    projectId: 'proj-1',
  };

  it('project tidak ditemukan -> NotFound PROJECT_NOT_FOUND', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expectCode(service.createCollection(dto(), 'user-1'), 'PROJECT_NOT_FOUND');
  });

  it('client invoice bukan POSTED -> Conflict INVOICE_NOT_POSTED', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.clientInvoice.findMany.mockResolvedValue([{ ...invoice, status: 'DRAFT' }]);
    prisma.collectionItem.groupBy.mockResolvedValue([]);
    await expectCode(service.createCollection(dto(), 'user-1'), 'INVOICE_NOT_POSTED');
  });

  it('invoice beda project -> Conflict INVOICE_PROJECT_MISMATCH', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.clientInvoice.findMany.mockResolvedValue([{ ...invoice, projectId: 'proj-2' }]);
    prisma.collectionItem.groupBy.mockResolvedValue([]);
    await expectCode(service.createCollection(dto(), 'user-1'), 'INVOICE_PROJECT_MISMATCH');
  });

  it('penerimaan melebihi saldo AR -> Conflict EXCEED_AR_OPEN', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.clientInvoice.findMany.mockResolvedValue([invoice]);
    prisma.collectionItem.groupBy.mockResolvedValue([{ clientInvoiceId: 'cinv-1', _sum: { amount: 450 } }]);
    await expectCode(service.createCollection(dto(), 'user-1'), 'EXCEED_AR_OPEN');
  });

  it('dua baris invoice SAMA yang totalnya melebihi saldo AR -> EXCEED_AR_OPEN', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.clientInvoice.findMany.mockResolvedValue([invoice]); // totalAmount 500
    prisma.collectionItem.groupBy.mockResolvedValue([]); // open = 500

    // Tiap baris (300) di bawah open, total 600 > 500.
    await expectCode(
      service.createCollection(
        dto({
          items: [
            { clientInvoiceId: 'cinv-1', amount: 300 },
            { clientInvoiceId: 'cinv-1', amount: 300 },
          ],
        }),
        'user-1',
      ),
      'EXCEED_AR_OPEN',
    );
  });

  it('dua baris invoice sama dalam batas -> SATU item dengan amount gabungan', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1' });
    prisma.clientInvoice.findMany.mockResolvedValue([invoice]);
    prisma.collectionItem.groupBy.mockResolvedValue([]);

    const tx = {
      numberSequence: { upsert: jest.fn().mockResolvedValue({ prefix: 'COL-2026-EPC-', nextNumber: 2 }) },
      collection: { create: jest.fn().mockResolvedValue({ id: 'col-1', collectionNumber: 'COL-2026-EPC-000001', items: [] }) },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx)); // eslint-disable-line @typescript-eslint/no-explicit-any

    await service.createCollection(
      dto({
        items: [
          { clientInvoiceId: 'cinv-1', amount: 200 },
          { clientInvoiceId: 'cinv-1', amount: 150 },
        ],
      }),
      'user-1',
    );

    const data = tx.collection.create.mock.calls[0][0].data as { totalAmount: number; items: { create: unknown[] } };
    expect(data.totalAmount).toBe(350);
    expect(data.items.create).toEqual([{ clientInvoiceId: 'cinv-1', amount: 350 }]);
  });

  describe('postCollection (penjaga AR yang mengikat — D1)', () => {
    const draftCollection = {
      id: 'col-1',
      collectionNumber: 'COL-2026-EPC-000001',
      status: 'DRAFT',
      totalAmount: 80,
      projectId: 'proj-1',
      items: [{ clientInvoiceId: 'cinv-1', amount: 80 }],
      project: { legalEntityId: 'ent-1' },
    };

    const makePostTx = () => ({
      clientInvoice: { findMany: jest.fn() },
      collectionItem: { groupBy: jest.fn() },
      collection: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'col-1', status: 'POSTED' }),
      },
    });

    const primePost = (committedCents: number, over: { total?: number; status?: string; projectId?: string } = {}) => {
      prisma.collection.findUnique.mockResolvedValue(draftCollection);
      const tx = makePostTx();
      tx.clientInvoice.findMany.mockResolvedValue([
        {
          id: 'cinv-1',
          invoiceNumber: 'CINV-0001',
          totalAmount: over.total ?? 100,
          status: over.status ?? 'POSTED',
          projectId: over.projectId ?? 'proj-1',
        },
      ]);
      tx.collectionItem.groupBy.mockResolvedValue(
        committedCents > 0 ? [{ clientInvoiceId: 'cinv-1', _sum: { amount: committedCents / 100 } }] : [],
      );
      prisma.$transaction.mockImplementation((cb: any) => cb(tx)); // eslint-disable-line @typescript-eslint/no-explicit-any
      return tx;
    };

    it('collection tidak ditemukan -> NotFound COLLECTION_NOT_FOUND', async () => {
      prisma.collection.findUnique.mockResolvedValue(null);
      await expectCode(service.postCollection('col-1', 'user-1'), 'COLLECTION_NOT_FOUND');
    });

    it('bukan DRAFT -> Conflict NOT_DRAFT', async () => {
      prisma.collection.findUnique.mockResolvedValue({ ...draftCollection, status: 'POSTED' });
      await expectCode(service.postCollection('col-1', 'user-1'), 'NOT_DRAFT');
    });

    it('saldo cukup -> POSTED, jurnal dipanggil di tx, CAS, audit, invalidate cache', async () => {
      const tx = primePost(0);

      const result = await service.postCollection('col-1', 'user-1');

      expect(result.status).toBe('POSTED');
      expect(gl.postCollectionJournal).toHaveBeenCalledWith(tx, expect.anything(), 'user-1');
      expect(tx.collection.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'col-1', status: 'DRAFT' } }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'Collection.POST', resource: 'Collection' }),
      );
      expect(cache.del).toHaveBeenCalled();
    });

    it('alokasi POSTED lain sudah mengikat sisa saldo -> Conflict EXCEED_AR_OPEN', async () => {
      // Invoice 100; sudah ada collection POSTED 80. Posting 80 berikutnya harus ditolak.
      primePost(8000, { total: 100 });
      await expectCode(service.postCollection('col-1', 'user-1'), 'EXCEED_AR_OPEN');
    });

    it('total tepat sama dengan sisa saldo -> boleh (batas presisi sen)', async () => {
      primePost(2000, { total: 100 });
      const result = await service.postCollection('col-1', 'user-1');
      expect(result.status).toBe('POSTED');
    });

    it('invoice sudah tidak POSTED -> Conflict INVOICE_NOT_POSTED', async () => {
      primePost(0, { status: 'DRAFT' });
      await expectCode(service.postCollection('col-1', 'user-1'), 'INVOICE_NOT_POSTED');
    });

    it('invoice beda project -> Conflict INVOICE_PROJECT_MISMATCH', async () => {
      primePost(0, { projectId: 'proj-2' });
      await expectCode(service.postCollection('col-1', 'user-1'), 'INVOICE_PROJECT_MISMATCH');
    });

    it('saldo kurang -> jurnal TIDAK dipanggil (tidak ada jurnal setengah jadi)', async () => {
      const tx = primePost(8000, { total: 100 });
      await expectCode(service.postCollection('col-1', 'user-1'), 'EXCEED_AR_OPEN');
      expect(gl.postCollectionJournal).not.toHaveBeenCalled();
      expect(tx.collection.updateMany).not.toHaveBeenCalled();
    });
  });
});
