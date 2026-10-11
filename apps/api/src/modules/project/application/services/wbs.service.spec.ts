import { ConflictException, NotFoundException } from '@nestjs/common';
import { WbsService } from './wbs.service';

/** Prisma mock: setiap model hanya menyediakan method yang dipakai service. */
function makePrisma(overrides: Record<string, unknown> = {}) {
  const zero = { count: jest.fn().mockResolvedValue(0) };
  return {
    project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
    wbsItem: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'w1' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    budgetItem: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
    purchaseRequisition: { ...zero },
    purchaseOrderItem: { ...zero },
    goodsReceiptItem: { ...zero },
    stockLedgerEntry: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
    materialIssueItem: { ...zero },
    stockAdjustmentItem: { ...zero },
    stockOpnameItem: { ...zero },
    stockTransferItem: { ...zero },
    journalLine: { ...zero },
    rfqItem: { ...zero },
    constructionWorkPackage: { ...zero },
    timesheet: { ...zero },
    costCode: { ...zero },
    controlAccount: { ...zero },
    ...overrides,
  } as never;
}

function makeService(prisma: unknown, audit: unknown = { record: jest.fn() }) {
  return new WbsService(prisma as never, audit as never);
}

describe('WbsService.update', () => {
  it('rejects an update that reuses an existing code', async () => {
    const prisma = makePrisma({
      wbsItem: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ id: 'w1', projectId: 'p1', code: '1.1' }) // load node
          .mockResolvedValueOnce({ id: 'other' }), // code collision
        update: jest.fn(),
      },
    });
    await expect(makeService(prisma).update('p1', 'w1', { code: '1.2' }, 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('404s when the node is not in the project', async () => {
    const prisma = makePrisma({
      wbsItem: { findUnique: jest.fn().mockResolvedValue({ id: 'w1', projectId: 'other' }), update: jest.fn() },
    });
    await expect(makeService(prisma).update('p1', 'w1', { name: 'X' }, 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates and audits a valid change', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const prisma = makePrisma({
      wbsItem: {
        findUnique: jest.fn().mockResolvedValue({ id: 'w1', projectId: 'p1', code: '1.1' }),
        update: jest.fn().mockResolvedValue({ id: 'w1', progressPercent: 55 }),
      },
    });
    const out = await makeService(prisma, audit).update('p1', 'w1', { progressPercent: 55 }, 'u1');
    expect(out).toMatchObject({ progressPercent: 55 });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'WBS.UPDATE' }));
  });
});

describe('WbsService.remove', () => {
  it('refuses to delete a node whose descendant owns a budget item', async () => {
    const prisma = makePrisma({
      wbsItem: {
        findUnique: jest.fn().mockResolvedValue({ id: 'w1', projectId: 'p1', code: '1' }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'w1', parentId: null },
          { id: 'w2', parentId: 'w1' },
        ]),
        deleteMany: jest.fn(),
      },
      budgetItem: { count: jest.fn().mockResolvedValue(1) },
    });
    await expect(makeService(prisma).remove('p1', 'w1', 'u1')).rejects.toMatchObject({
      response: { code: 'WBS_HAS_LINKS' },
    });
  });

  it('deletes a node with no linked documents, deepest first', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = makePrisma({
      wbsItem: {
        findUnique: jest.fn().mockResolvedValue({ id: 'w1', projectId: 'p1', code: '1' }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'w1', parentId: null },
          { id: 'w2', parentId: 'w1' },
        ]),
        deleteMany,
      },
    });
    await makeService(prisma, audit).remove('p1', 'w1', 'u1');
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['w2', 'w1'] } } });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'WBS.DELETE' }));
  });

  it('404s when the node does not exist', async () => {
    const prisma = makePrisma({
      wbsItem: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn() },
    });
    await expect(makeService(prisma).remove('p1', 'nope', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('WbsService.move', () => {
  it('rejects moving a node under its own descendant', async () => {
    const prisma = makePrisma({
      wbsItem: {
        findUnique: jest.fn().mockResolvedValue({ id: 'w1', projectId: 'p1', code: '1' }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'w1', parentId: null },
          { id: 'w2', parentId: 'w1' },
        ]),
        update: jest.fn(),
      },
    });
    await expect(makeService(prisma).move('p1', 'w1', { parentId: 'w2' }, 'u1')).rejects.toMatchObject({
      response: { code: 'WBS_CYCLE' },
    });
  });

  it('rejects making a node its own parent', async () => {
    const prisma = makePrisma({
      wbsItem: { findUnique: jest.fn().mockResolvedValue({ id: 'w1', projectId: 'p1', code: '1' }), update: jest.fn() },
    });
    await expect(makeService(prisma).move('p1', 'w1', { parentId: 'w1' }, 'u1')).rejects.toMatchObject({
      response: { code: 'WBS_CYCLE' },
    });
  });

  it('reparents a node to a valid parent and audits it', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const prisma = makePrisma({
      wbsItem: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ id: 'w3', projectId: 'p1', code: '3' }) // the node
          .mockResolvedValueOnce({ id: 'w1', projectId: 'p1' }), // the parent
        findMany: jest.fn().mockResolvedValue([{ id: 'w3', parentId: null }]),
        update: jest.fn().mockResolvedValue({ id: 'w3', parentId: 'w1' }),
      },
    });
    const out = await makeService(prisma, audit).move('p1', 'w3', { parentId: 'w1', sortOrder: 2 }, 'u1');
    expect(out).toMatchObject({ parentId: 'w1' });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'WBS.MOVE' }));
  });
});

describe('WbsService.getTree', () => {
  it('attaches a rollup to every node', async () => {
    const prisma = makePrisma({
      wbsItem: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'w1', projectId: 'p1', parentId: null, code: '1', name: 'Eng', sortOrder: 1, progressPercent: 0, plannedStart: null, plannedEnd: null, responsibleManager: 'Ahmad', isMilestone: false },
          { id: 'w2', projectId: 'p1', parentId: 'w1', code: '1.1', name: 'Detail', sortOrder: 1, progressPercent: 100, plannedStart: null, plannedEnd: null, responsibleManager: null, isMilestone: false },
          { id: 'w3', projectId: 'p1', parentId: 'w1', code: '1.2', name: 'Drawings', sortOrder: 2, progressPercent: 0, plannedStart: null, plannedEnd: null, responsibleManager: null, isMilestone: false },
        ]),
        findUnique: jest.fn(),
      },
      budgetItem: { groupBy: jest.fn().mockResolvedValue([{ wbsItemId: 'w2', _sum: { amount: 100 } }, { wbsItemId: 'w3', _sum: { amount: 300 } }]) },
      stockLedgerEntry: { groupBy: jest.fn().mockResolvedValue([{ wbsItemId: 'w2', _sum: { totalValue: -40 } }]) },
    });
    const tree = await makeService(prisma).getTree('p1');
    expect(tree[0]!.rollup.budget).toBe(400);
    expect(tree[0]!.rollup.progress).toBe(25); // (100*100 + 0*300) / 400
    expect(tree[0]!.rollup.actual).toBe(40);
    expect(tree[0]!.children[0]).toHaveProperty('responsibleManager');
  });
});
