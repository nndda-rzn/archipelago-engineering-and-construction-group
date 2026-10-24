import { ControlAccountService } from './control-account.service';

/**
 * `dataIssue` adalah sinyal kepercayaan halaman Project Controls: ia menandai
 * control account yang punya progres tetapi belum punya nilai rencana, sehingga
 * SPI tidak dapat dihitung. Setelah PV diisi dari budget WBS (migration
 * `20261024_backfill_control_account_pv`), penanda ini harus padam — kalau tidak,
 * halaman akan terus melaporkan masalah data yang sudah tidak ada.
 */
const prisma = {
  controlAccount: { findMany: jest.fn(), count: jest.fn() },
  // `listControlAccounts` menjalankan findMany + count di dalam $transaction.
  $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
};
const audit = { record: jest.fn() };

const make = () => new ControlAccountService(prisma as never, audit as never);

const ca = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'ca1',
  code: 'CA-014-ENG',
  name: 'Engineering & Design',
  projectId: 'p1',
  wbsItemId: 'w1',
  budgetAmount: 0,
  plannedValue: 0,
  progressPercent: 0,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  prisma.controlAccount.count.mockResolvedValue(1);
});

describe('dataIssue', () => {
  it('flags a control account with progress but no planned value', async () => {
    prisma.controlAccount.findMany.mockResolvedValue([ca({ progressPercent: 70, plannedValue: 0, budgetAmount: 0 })]);
    const res = await make().listControlAccounts('p1', {} as never);
    expect(res.items[0]!.dataIssue).toBe(true);
  });

  it('clears the flag once planned value is present', async () => {
    // Keadaan setelah backfill: PV terisi dari budget WBS.
    prisma.controlAccount.findMany.mockResolvedValue([
      ca({ progressPercent: 70, plannedValue: 1_920_000_000_000, budgetAmount: 1_920_000_000_000 }),
    ]);
    const res = await make().listControlAccounts('p1', {} as never);
    expect(res.items[0]!.dataIssue).toBe(false);
  });

  it('does not flag a control account with no progress yet', async () => {
    prisma.controlAccount.findMany.mockResolvedValue([ca({ progressPercent: 0, plannedValue: 0, budgetAmount: 0 })]);
    const res = await make().listControlAccounts('p1', {} as never);
    expect(res.items[0]!.dataIssue).toBe(false);
  });

  it('does not flag a control account that has budget but no planned value', async () => {
    // Budget ada, PV belum: tetap bukan masalah data menurut definisi sekarang,
    // karena yang membuat SPI mustahil adalah PV = 0 DAN budget = 0.
    prisma.controlAccount.findMany.mockResolvedValue([
      ca({ progressPercent: 35, plannedValue: 0, budgetAmount: 740_000_000_000 }),
    ]);
    const res = await make().listControlAccounts('p1', {} as never);
    expect(res.items[0]!.dataIssue).toBe(false);
  });

  it('sums to the project BAC when every WBS is covered by one control account', async () => {
    // Invarian yang dijaga backfill: total PV seluruh CA = BAC proyek.
    const bac = 4_800_000_000_000;
    prisma.controlAccount.findMany.mockResolvedValue([
      ca({ id: 'a', code: 'CA-014-ENG', plannedValue: 480_000_000_000, budgetAmount: 480_000_000_000 }),
      ca({ id: 'b', code: 'CA-014-PROC', plannedValue: 1_920_000_000_000, budgetAmount: 1_920_000_000_000 }),
      ca({ id: 'c', code: 'CA-014-CONS', plannedValue: 1_920_000_000_000, budgetAmount: 1_920_000_000_000 }),
      ca({ id: 'd', code: 'CA-014-COMM', plannedValue: 480_000_000_000, budgetAmount: 480_000_000_000 }),
    ]);
    prisma.controlAccount.count.mockResolvedValue(4);

    const res = await make().listControlAccounts('p1', {} as never);
    const totalPv = res.items.reduce((s, i) => s + Number(i.plannedValue), 0);
    expect(totalPv).toBe(bac);
    expect(res.items.every((i) => i.dataIssue === false)).toBe(true);
  });
});
