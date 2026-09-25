import { withSerializableRetry } from './serializable-tx';

describe('withSerializableRetry', () => {
  const makePrisma = () => ({
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn({})),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sukses di percobaan pertama -> closure dipanggil 1x, hasil dikembalikan', async () => {
    const prisma = makePrisma();
    const fn = jest.fn().mockResolvedValue('ok');

    const res = await withSerializableRetry(prisma as never, fn, { label: 'test.ok' });

    expect(res).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('memakai isolationLevel Serializable', async () => {
    const prisma = makePrisma();
    const fn = jest.fn().mockResolvedValue(1);

    await withSerializableRetry(prisma as never, fn, { label: 'test.iso' });

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'Serializable' }),
    );
  });

  it('P2034 sekali lalu sukses -> closure dipanggil 2x', async () => {
    const prisma = makePrisma();
    const conflict = Object.assign(new Error('write conflict'), { code: 'P2034' });
    const fn = jest.fn().mockRejectedValueOnce(conflict).mockResolvedValue('recovered');

    const res = await withSerializableRetry(prisma as never, fn, { label: 'test.retry', baseDelayMs: 0 });

    expect(res).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('P2034 habis maxAttempts -> konflik 409, closure tepat maxAttempts kali', async () => {
    const prisma = makePrisma();
    const conflict = Object.assign(new Error('write conflict'), { code: 'P2034' });
    const fn = jest.fn().mockRejectedValue(conflict);

    await expect(
      withSerializableRetry(prisma as never, fn, { label: 'test.exhaust', maxAttempts: 3, baseDelayMs: 0 }),
    ).rejects.toMatchObject({ response: { code: 'RETRY_CONFLICT' } });

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('error non-retryable (P2025) -> throw langsung, closure 1x', async () => {
    const prisma = makePrisma();
    const notFound = Object.assign(new Error('not found'), { code: 'P2025' });
    const fn = jest.fn().mockRejectedValue(notFound);

    await expect(withSerializableRetry(prisma as never, fn, { label: 'test.nonretry' })).rejects.toThrow('not found');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('kode mentah Postgres 40001 di meta.code -> ikut retry', async () => {
    const prisma = makePrisma();
    const pgConflict = Object.assign(new Error('serialization_failure'), { meta: { code: '40001' } });
    const fn = jest.fn().mockRejectedValueOnce(pgConflict).mockResolvedValue('ok');

    const res = await withSerializableRetry(prisma as never, fn, { label: 'test.pgcode', baseDelayMs: 0 });

    expect(res).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('adapter pg: konflik pada commit DriverAdapterError TransactionWriteConflict ikut retry', async () => {
    const prisma = makePrisma();
    const conflict = Object.assign(new Error('TransactionWriteConflict'), {
      name: 'DriverAdapterError',
      cause: { kind: 'TransactionWriteConflict' },
    });
    prisma.$transaction = jest.fn()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce('recovered');
    const fn = jest.fn().mockResolvedValue('result');

    await expect(withSerializableRetry(prisma as never, fn, { label: 'test.adapter', baseDelayMs: 0 }))
      .resolves.toBe('recovered');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('adapter pg: retry habis mengembalikan 409 RETRY_CONFLICT, bukan 500', async () => {
    const prisma = makePrisma();
    const conflict = Object.assign(new Error('TransactionWriteConflict'), {
      name: 'DriverAdapterError',
      cause: { kind: 'TransactionWriteConflict' },
    });
    prisma.$transaction = jest.fn().mockRejectedValue(conflict);

    try {
      await withSerializableRetry(prisma as never, jest.fn(), {
        label: 'test.adapter-exhaust', maxAttempts: 2, baseDelayMs: 0,
      });
      fail('expected conflict');
    } catch (err) {
      expect((err as { getStatus?: () => number }).getStatus?.()).toBe(409);
      expect((err as { getResponse?: () => unknown }).getResponse?.()).toEqual(
        expect.objectContaining({ code: 'RETRY_CONFLICT' }),
      );
    }
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});
