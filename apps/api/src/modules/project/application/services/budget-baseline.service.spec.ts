import { ConflictException, NotFoundException } from '@nestjs/common';
import { BudgetBaselineService } from './budget-baseline.service';

const tx = {
  budgetBaseline: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  budgetBaselineLine: { createMany: jest.fn(), findMany: jest.fn() },
  budgetItem: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn(), updateMany: jest.fn() },
};

const prisma = {
  project: { findUnique: jest.fn() },
  budgetItem: { findMany: jest.fn() },
  budgetBaseline: { findFirst: jest.fn(), findMany: jest.fn() },
  budgetBaselineLine: { findMany: jest.fn() },
  $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
};

const audit = { record: jest.fn() };
const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPattern: jest.fn() };

const make = () => new BudgetBaselineService(prisma as never, audit as never, cache as never);

/**
 * Fake `findFirst` yang menghormati filter `status`. Tanpa ini, pemanggilan
 * kedua (cek DRAFT lalu ambil versi terakhir) mengembalikan baris yang sama dan
 * test gagal karena alasan yang salah — bukan karena kode salah.
 */
const baselineLookups = (state: {
  openDraft?: { id: string; version: number; status: string } | null;
  lastFrozen?: { id: string; version: number; status: string } | null;
  lastAny?: { id: string; version: number; status: string } | null;
}) => {
  tx.budgetBaseline.findFirst.mockImplementation(async (args: { where?: { status?: string } }) => {
    const status = args?.where?.status;
    if (status === 'DRAFT') return state.openDraft ?? null;
    if (status === 'FROZEN') return state.lastFrozen ?? null;
    return state.lastAny ?? null;
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  prisma.project.findUnique.mockResolvedValue({ id: 'p1', code: 'PRJ-1' });
});

describe('freeze', () => {
  it('refuses when the project has no budget rows', async () => {
    prisma.budgetItem.findMany.mockResolvedValue([]);
    await expect(make().freeze('p1', {}, 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('freezes the open revision instead of refusing it', async () => {
    prisma.budgetItem.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }]);
    baselineLookups({ openDraft: { id: 'b2', version: 2, status: 'DRAFT' } });
    tx.budgetBaseline.update.mockResolvedValue({ id: 'b2', version: 2, status: 'FROZEN', label: 'VO-01', reason: 'VO-01 steel' });

    await make().freeze('p1', { label: 'VO-01' }, 'u1');

    // Baris draft disegarkan dari budget hidup, lalu header dibekukan.
    expect(tx.budgetBaselineLine.deleteMany).toHaveBeenCalledWith({ where: { baselineId: 'b2' } });
    expect(tx.budgetBaseline.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'b2' }, data: expect.objectContaining({ status: 'FROZEN' }) }),
    );
    expect(tx.budgetItem.updateMany).toHaveBeenCalledWith({
      where: { projectId: 'p1' },
      data: { status: 'PUBLISHED' },
    });
  });

  it('throws NotFound when the project does not exist', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(make().freeze('nope', {}, 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('copies every budget row into a new FROZEN version', async () => {
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'w1', costType: 'LABOR', amount: 100 },
      { wbsItemId: 'w1', costType: 'MATERIAL', amount: 250 },
    ]);
    baselineLookups({ lastAny: { id: 'b1', version: 1, status: 'FROZEN' } });
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b2', version: 2, status: 'FROZEN' });

    await make().freeze('p1', { label: 'Original' }, 'u1');

    expect(tx.budgetBaseline.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: 'p1', version: 2, status: 'FROZEN', label: 'Original' }),
      }),
    );
    expect(tx.budgetBaselineLine.createMany).toHaveBeenCalledWith({
      data: [
        { baselineId: 'b2', wbsItemId: 'w1', costType: 'LABOR', amount: 100 },
        { baselineId: 'b2', wbsItemId: 'w1', costType: 'MATERIAL', amount: 250 },
      ],
    });
  });

  it('marks the live rows PUBLISHED so existing readers keep working', async () => {
    prisma.budgetItem.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }]);
    baselineLookups({});
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b1', version: 1, status: 'FROZEN' });

    await make().freeze('p1', {}, 'u1');

    expect(tx.budgetItem.updateMany).toHaveBeenCalledWith({
      where: { projectId: 'p1' },
      data: { status: 'PUBLISHED' },
    });
  });

  it('writes an audit record and invalidates the analytics cache', async () => {
    prisma.budgetItem.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }]);
    baselineLookups({});
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b1', version: 1, status: 'FROZEN' });

    await make().freeze('p1', {}, 'u1');

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'BUDGET.BASELINE_FREEZE' }));
    expect(cache.delByPattern).toHaveBeenCalled();
  });

  it('numbers the first baseline as version 1', async () => {
    prisma.budgetItem.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }]);
    baselineLookups({ lastAny: null });
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b1', version: 1, status: 'FROZEN' });

    await make().freeze('p1', {}, 'u1');

    expect(tx.budgetBaseline.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: 1 }) }),
    );
  });
});

describe('openRevision', () => {
  it('refuses when there is no frozen baseline to revise', async () => {
    baselineLookups({});
    await expect(make().openRevision('p1', { reason: 'VO-01' }, 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses when a revision is already open', async () => {
    baselineLookups({ openDraft: { id: 'b', version: 2, status: 'DRAFT' } });
    await expect(make().openRevision('p1', { reason: 'VO-01' }, 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('copies the last frozen version into a DRAFT and mirrors it into BudgetItem', async () => {
    baselineLookups({ lastFrozen: { id: 'b1', version: 1, status: 'FROZEN' } });
    tx.budgetBaselineLine.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }]);
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b2', version: 2, status: 'DRAFT' });

    await make().openRevision('p1', { reason: 'VO-01 steel' }, 'u1');

    expect(tx.budgetItem.deleteMany).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
    expect(tx.budgetItem.createMany).toHaveBeenCalledWith({
      data: [{ projectId: 'p1', wbsItemId: 'w1', costType: 'LABOR', amount: 100, status: 'DRAFT' }],
    });
  });

  it('leaves the frozen baseline untouched', async () => {
    baselineLookups({ lastFrozen: { id: 'b1', version: 1, status: 'FROZEN' } });
    tx.budgetBaselineLine.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }]);
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b2', version: 2, status: 'DRAFT' });

    await make().openRevision('p1', { reason: 'VO-01' }, 'u1');

    expect(tx.budgetBaseline.update).not.toHaveBeenCalled();
  });

  it('also copies the lines into the new DRAFT so it is inspectable', async () => {
    baselineLookups({ lastFrozen: { id: 'b1', version: 1, status: 'FROZEN' } });
    tx.budgetBaselineLine.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }]);
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b2', version: 2, status: 'DRAFT' });

    await make().openRevision('p1', { reason: 'VO-01' }, 'u1');

    expect(tx.budgetBaselineLine.createMany).toHaveBeenCalledWith({
      data: [{ baselineId: 'b2', wbsItemId: 'w1', costType: 'LABOR', amount: 100 }],
    });
  });

  it('records the reason on the draft version', async () => {
    baselineLookups({ lastFrozen: { id: 'b1', version: 1, status: 'FROZEN' } });
    tx.budgetBaselineLine.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }]);
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b2', version: 2, status: 'DRAFT' });

    await make().openRevision('p1', { reason: 'VO-01 steel' }, 'u1');

    expect(tx.budgetBaseline.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reason: 'VO-01 steel', status: 'DRAFT' }) }),
    );
  });
});

describe('findBaseline', () => {
  it('returns the latest frozen version and the one before it', async () => {
    prisma.budgetBaseline.findMany.mockResolvedValue([
      { id: 'b2', version: 2, status: 'FROZEN', label: 'VO-01', reason: null, frozenAt: new Date('2026-02-01'), lines: [{ amount: 300 }] },
      { id: 'b1', version: 1, status: 'FROZEN', label: 'Original', reason: null, frozenAt: new Date('2026-01-01'), lines: [{ amount: 200 }] },
    ]);

    const res = await make().findBaseline('p1');

    expect(res.current!.version).toBe(2);
    expect(res.current!.total).toBe(300);
    expect(res.previous!.version).toBe(1);
  });

  it('returns nulls when nothing is frozen yet', async () => {
    prisma.budgetBaseline.findMany.mockResolvedValue([]);
    const res = await make().findBaseline('p1');
    expect(res.current).toBeNull();
    expect(res.previous).toBeNull();
  });
});
