import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BudgetService } from './budget.service';

const prisma = {
  project: { findUnique: jest.fn() },
  wbsItem: { findMany: jest.fn(), findUnique: jest.fn() },
  budgetItem: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
  stockLedgerEntry: { groupBy: jest.fn() },
  journalLine: { groupBy: jest.fn() },
  controlAccount: { groupBy: jest.fn() },
  budgetBaseline: { findFirst: jest.fn(), findMany: jest.fn() },
  budgetBaselineLine: { findMany: jest.fn() },
  purchaseOrderItem: { groupBy: jest.fn() },
  forecast: { findFirst: jest.fn() },
};
const audit = { record: jest.fn() };
const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPattern: jest.fn() };

const make = () => new BudgetService(prisma as never, audit as never, cache as never);

const project = { id: 'p1', contractValue: 5000, currency: 'IDR' };
const oneWbs = [{ id: 'w1', code: '1', name: 'Engineering', parentId: null }];

/** Isi default supaya test yang tidak peduli input tertentu tetap berjalan. */
beforeEach(() => {
  jest.clearAllMocks();
  prisma.stockLedgerEntry.groupBy.mockResolvedValue([]);
  prisma.journalLine.groupBy.mockResolvedValue([]);
  prisma.controlAccount.groupBy.mockResolvedValue([]);
  prisma.budgetBaseline.findFirst.mockResolvedValue(null);
  prisma.budgetBaseline.findMany.mockResolvedValue([]);
  prisma.budgetBaselineLine.findMany.mockResolvedValue([]);
  prisma.purchaseOrderItem.groupBy.mockResolvedValue([]);
  prisma.forecast.findFirst.mockResolvedValue(null);
});

describe('findAll', () => {
  it('returns a statement with baseline, revised, actual and derived columns', async () => {
    prisma.project.findUnique.mockResolvedValue(project);
    prisma.wbsItem.findMany.mockResolvedValue(oneWbs);
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'w1', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 },
    ]);
    prisma.stockLedgerEntry.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { totalValue: -400 } }]);
    prisma.controlAccount.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { plannedValue: 600 } }]);
    prisma.budgetBaseline.findFirst.mockResolvedValue({
      id: 'b1', version: 1, status: 'FROZEN', label: null, reason: null, frozenAt: new Date('2026-01-01'),
    });
    prisma.budgetBaseline.findMany.mockResolvedValue([
      { id: 'b1', version: 1, status: 'FROZEN', label: null, reason: null, frozenAt: new Date('2026-01-01'), lines: [{ amount: 900 }] },
    ]);
    prisma.budgetBaselineLine.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 900 }]);

    const res = await make().findAll('p1');

    expect(res.rows[0]!.revised).toBe(1000);
    expect(res.rows[0]!.baseline).toBe(900);
    expect(res.rows[0]!.actual).toBe(400);
    expect(res.rows[0]!.variance).toBe(600);
    expect(res.rows[0]!.varianceBaseline).toBe(100);
    expect(res.totals.contractValue).toBe(5000);
    expect(res.baseline!.version).toBe(1);
    expect(res.versions).toHaveLength(1);
    expect(res.versions[0]!.total).toBe(900);
    expect(res.composition).toEqual([{ costType: 'LABOR', amount: 1000 }]);
  });

  it('counts actual from the ledger only, never adding the expense journal', async () => {
    prisma.project.findUnique.mockResolvedValue(project);
    prisma.wbsItem.findMany.mockResolvedValue(oneWbs);
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'w1', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 },
    ]);
    prisma.stockLedgerEntry.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { totalValue: -400 } }]);
    prisma.journalLine.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { debit: 75 } }]);

    const res = await make().findAll('p1');

    // Regresi: dulu `used` = 475 karena jurnal ikut dijumlahkan. Material issue
    // hanya menulis ledger, sedangkan jurnal 6100 berasal dari invoice atas
    // material yang sama — menjumlahkan keduanya menghitung material dua kali.
    expect(res.rows[0]!.actual).toBe(400);
    expect(res.reconciliation.journalExpense610).toBe(75);
    expect(res.reconciliation.ledgerOut).toBe(400);
    expect(res.reconciliation.doubleCountRisk).toBe(true);
  });

  it('reports no baseline rather than pretending one exists', async () => {
    prisma.project.findUnique.mockResolvedValue(project);
    prisma.wbsItem.findMany.mockResolvedValue(oneWbs);
    prisma.budgetItem.findMany.mockResolvedValue([]);

    const res = await make().findAll('p1');

    expect(res.baseline).toBeNull();
    expect(res.versions).toEqual([]);
    expect(res.rows[0]!.baseline).toBe(0);
  });

  it('takes committed from released PO items on the same WBS', async () => {
    prisma.project.findUnique.mockResolvedValue(project);
    prisma.wbsItem.findMany.mockResolvedValue(oneWbs);
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'w1', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 },
    ]);
    prisma.purchaseOrderItem.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { totalPrice: 250 } }]);

    const res = await make().findAll('p1');

    expect(res.rows[0]!.committed).toBe(250);
    expect(res.rows[0]!.available).toBe(750);
  });

  it('exposes EAC and VAC on the totals only, never per row', async () => {
    prisma.project.findUnique.mockResolvedValue(project);
    prisma.wbsItem.findMany.mockResolvedValue(oneWbs);
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'w1', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 },
    ]);
    prisma.forecast.findFirst.mockResolvedValue({ estimateAtCompletion: 1200, varianceAtCompletion: -200 });

    const res = await make().findAll('p1');

    expect(res.totals.eac).toBe(1200);
    expect(res.totals.vac).toBe(-200);
    expect('eac' in res.rows[0]!).toBe(false);
  });

  it('returns an empty statement without crashing when the project has no WBS', async () => {
    prisma.project.findUnique.mockResolvedValue(project);
    prisma.wbsItem.findMany.mockResolvedValue([]);
    prisma.budgetItem.findMany.mockResolvedValue([]);

    const res = await make().findAll('p1');

    expect(res.rows).toEqual([]);
    expect(res.totals.revised).toBe(0);
    expect(res.costCoverage).toEqual({ allocatedNodes: 0, totalNodes: 0 });
  });

  it('rolls a child up to its parent and emits pre-order', async () => {
    prisma.project.findUnique.mockResolvedValue(project);
    prisma.wbsItem.findMany.mockResolvedValue([
      { id: 'p', code: '1', name: 'Engineering', parentId: null },
      { id: 'c', code: '1.1', name: 'Detail', parentId: 'p' },
    ]);
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'c', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 },
    ]);

    const res = await make().findAll('p1');
    const parent = res.rows.find((r) => r.id === 'p')!;
    const child = res.rows.find((r) => r.id === 'c')!;

    expect(parent.revised).toBe(1000);
    expect(parent.childrenCount).toBe(1);
    expect(child.depth).toBe(1);
    expect(res.rows.map((r) => r.id)).toEqual(['p', 'c']);
  });

  it('throws PROJECT_NOT_FOUND for an unknown project', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(make().findAll('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns every version with its own total, newest first', async () => {
    prisma.project.findUnique.mockResolvedValue(project);
    prisma.wbsItem.findMany.mockResolvedValue(oneWbs);
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'w1', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 },
    ]);
    prisma.budgetBaseline.findFirst.mockImplementation(async (args: { where?: { status?: string } }) => {
      if (args?.where?.status === 'DRAFT') return null;
      return { id: 'b2', version: 2, status: 'FROZEN', label: null, reason: null, frozenAt: new Date('2026-02-01') };
    });
    prisma.budgetBaselineLine.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 900 }]);
    prisma.budgetBaseline.findMany.mockResolvedValue([
      { id: 'b2', version: 2, status: 'FROZEN', label: 'VO-01', reason: 'steel', frozenAt: new Date('2026-02-01'), lines: [{ amount: 900 }] },
      { id: 'b1', version: 1, status: 'FROZEN', label: 'Original', reason: null, frozenAt: new Date('2026-01-01'), lines: [{ amount: 800 }] },
    ]);

    const res = await make().findAll('p1');

    expect(res.baseline!.version).toBe(2);
    expect(res.versions.map((v) => v.version)).toEqual([2, 1]);
    // Tiap total berasal dari barisnya sendiri, bukan dihitung ulang dari data hidup.
    expect(res.versions[0]!.total).toBe(900);
    expect(res.versions[1]!.total).toBe(800);
  });

  it('sorts the composition by amount, largest first', async () => {
    prisma.project.findUnique.mockResolvedValue(project);
    prisma.wbsItem.findMany.mockResolvedValue(oneWbs);
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'w1', costType: 'LABOR', amount: 100 },
      { wbsItemId: 'w1', costType: 'MATERIAL', amount: 900 },
      { wbsItemId: 'w1', costType: 'EQUIPMENT', amount: 500 },
    ]);

    const res = await make().findAll('p1');

    expect(res.composition).toEqual([
      { costType: 'MATERIAL', amount: 900 },
      { costType: 'EQUIPMENT', amount: 500 },
      { costType: 'LABOR', amount: 100 },
    ]);
  });
});

describe('upsert', () => {
  it('rejects a missing cost type instead of writing DIRECT', async () => {
    await expect(
      make().upsert('p1', { wbsItemId: 'w1', amount: 10 } as never, 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates the existing row for the same cost type', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.wbsItem.findUnique.mockResolvedValue({ id: 'w1', projectId: 'p1', code: '1' });
    prisma.budgetItem.findUnique.mockResolvedValue({ id: 'b1', status: 'DRAFT' });
    prisma.budgetItem.upsert.mockResolvedValue({ id: 'b1' });

    await make().upsert('p1', { wbsItemId: 'w1', costType: 'LABOR', amount: 10 }, 'u1');

    expect(prisma.budgetItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId_wbsItemId_costType: { projectId: 'p1', wbsItemId: 'w1', costType: 'LABOR' } },
      }),
    );
  });

  it('keeps refusing to edit a published budget', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.wbsItem.findUnique.mockResolvedValue({ id: 'w1', projectId: 'p1', code: '1' });
    prisma.budgetItem.findUnique.mockResolvedValue({ id: 'b1', status: 'PUBLISHED' });

    await expect(
      make().upsert('p1', { wbsItemId: 'w1', costType: 'LABOR', amount: 10 }, 'u1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

