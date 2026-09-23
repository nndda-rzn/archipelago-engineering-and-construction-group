import { SequenceHelper } from './sequence.helper';

describe('SequenceHelper', () => {
  let helper: SequenceHelper;
  const prisma = { $transaction: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    helper = new SequenceHelper(prisma as never);
  });

  const seqRow = { prefix: 'DRW-2026-', nextNumber: 7 };

  it('tanpa tx -> buka $transaction sendiri dan format hasil (nextNumber - 1)', async () => {
    const tx = { numberSequence: { upsert: jest.fn().mockResolvedValue(seqRow) } };
    prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

    const res = await helper.next('DRW', 'DRW-2026-');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(res).toBe('DRW-2026-000006');
  });

  it('dengan tx -> pakai tx yang diberi, TIDAK buka $transaction baru', async () => {
    const tx = { numberSequence: { upsert: jest.fn().mockResolvedValue(seqRow) } };

    const res = await helper.next('DRW', 'DRW-2026-', tx as never);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.numberSequence.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { code: 'DRW' } }));
    expect(res).toBe('DRW-2026-000006');
  });

  it('upsert pakai prefix mentah + increment nextNumber', async () => {
    const tx = { numberSequence: { upsert: jest.fn().mockResolvedValue(seqRow) } };

    await helper.next('DRW', 'DRW-2026-', tx as never);

    expect(tx.numberSequence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { nextNumber: { increment: 1 } },
        create: expect.objectContaining({ code: 'DRW', prefix: 'DRW-2026-', nextNumber: 2 }),
      }),
    );
  });
});
