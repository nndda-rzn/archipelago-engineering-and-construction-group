import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BudgetService } from './budget.service';

const prisma = {
  project: { findUnique: jest.fn() },
  wbsItem: { findMany: jest.fn(), findUnique: jest.fn() },
  budgetItem: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
  stockLedgerEntry: { groupBy: jest.fn() },
  journalLine: { groupBy: jest.fn() },
  controlAccount: { groupBy: jest.fn() },
};
const audit = { record: jest.fn() };
const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPattern: jest.fn() };

const make = () => new BudgetService(prisma as never, audit as never, cache as never);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.stockLedgerEntry.groupBy.mockResolvedValue([]);
  prisma.journalLine.groupBy.mockResolvedValue([]);
  prisma.controlAccount.groupBy.mockResolvedValue([]);
});

describe('findAll', () => {
  it('returns spend per WBS, cost breakdown, totals and warnings', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p1', contractValue: 5000 });
    prisma.wbsItem.findMany.mockResolvedValue([{ id: 'w1', code: '1', name: 'Engineering', parentId: null }]);
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'w1', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 },
    ]);
    prisma.stockLedgerEntry.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { totalValue: -400 } }]);
    prisma.controlAccount.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { plannedValue: 600 } }]);

    const res = await make().findAll('p1');
    expect(res.wbs[0]!.budget).toBe(1000);
    expect(res.wbs[0]!.used).toBe(400);
    expect(res.wbs[0]!.byCostType).toEqual({ LABOR: 1000 });
    expect(res.totals.contractValue).toBe(5000);
    expect(res.totals.variance).toBe(4000);
    expect(res.warnings.pvMismatch?.ratio).toBeCloseTo(0.6, 2);
    expect(res.costCoverage).toEqual({ allocatedNodes: 1, totalNodes: 1 });
  });

  it('adds journal debits to the ledger spend instead of double counting them', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p1', contractValue: 5000 });
    prisma.wbsItem.findMany.mockResolvedValue([{ id: 'w1', code: '1', name: 'Engineering', parentId: null }]);
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'w1', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 },
    ]);
    prisma.stockLedgerEntry.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { totalValue: -400 } }]);
    prisma.journalLine.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { debit: 75 } }]);

    const res = await make().findAll('p1');
    expect(res.wbs[0]!.used).toBe(475);
  });

  it('returns an empty tree without crashing when the project has no WBS', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p1', contractValue: 5000 });
    prisma.wbsItem.findMany.mockResolvedValue([]);
    prisma.budgetItem.findMany.mockResolvedValue([]);

    const res = await make().findAll('p1');
    expect(res.wbs).toEqual([]);
    expect(res.totals.budget).toBe(0);
    expect(res.costCoverage).toEqual({ allocatedNodes: 0, totalNodes: 0 });
  });

  it('rolls a child up to its parent and flattens the result', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p1', contractValue: 5000 });
    prisma.wbsItem.findMany.mockResolvedValue([
      { id: 'p', code: '1', name: 'Engineering', parentId: null },
      { id: 'c', code: '1.1', name: 'Detail', parentId: 'p' },
    ]);
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'c', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 },
    ]);

    const res = await make().findAll('p1');
    const parent = res.wbs.find((w) => w.id === 'p')!;
    const child = res.wbs.find((w) => w.id === 'c')!;
    expect(parent.budget).toBe(1000);
    expect(parent.childrenCount).toBe(1);
    expect(child.depth).toBe(1);
    expect(res.wbs).toHaveLength(2);
  });

  it('throws PROJECT_NOT_FOUND for an unknown project', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(make().findAll('nope')).rejects.toBeInstanceOf(NotFoundException);
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
