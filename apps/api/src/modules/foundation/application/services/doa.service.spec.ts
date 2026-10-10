import { DoaService } from './doa.service';

function makeService(rules: unknown[]) {
  const prisma = { doaRule: { findMany: async () => rules } } as never;
  return new DoaService(prisma, { record: jest.fn() } as never);
}

describe('DoaService.analyzeRules', () => {
  it('treats an open upper bound as unbounded and finds the overlap', async () => {
    const svc = makeService([
      { id: 'r1', transactionType: 'PurchaseOrder', amountFrom: 0, amountTo: 100, status: 'ACTIVE' },
      { id: 'r2', transactionType: 'PurchaseOrder', amountFrom: 50, amountTo: null, status: 'ACTIVE' },
    ]);
    const out = await svc.analyzeRules('PurchaseOrder');
    expect(out.overlaps).toEqual([{ aId: 'r1', bId: 'r2', from: 50, to: 100 }]);
  });

  it('does not count ranges that only touch at a boundary', async () => {
    const svc = makeService([
      { id: 'r1', transactionType: 'PurchaseOrder', amountFrom: 0, amountTo: 100, status: 'ACTIVE' },
      { id: 'r2', transactionType: 'PurchaseOrder', amountFrom: 100, amountTo: 200, status: 'ACTIVE' },
    ]);
    const out = await svc.analyzeRules('PurchaseOrder');
    expect(out.overlaps).toEqual([]);
  });

  it('reports the gap between two closed ranges', async () => {
    const svc = makeService([
      { id: 'r1', transactionType: 'PurchaseOrder', amountFrom: 0, amountTo: 100, status: 'ACTIVE' },
      { id: 'r2', transactionType: 'PurchaseOrder', amountFrom: 500, amountTo: 1000, status: 'ACTIVE' },
    ]);
    const out = await svc.analyzeRules('PurchaseOrder');
    expect(out.gaps).toEqual([{ from: 100, to: 500 }]);
  });

  it('reports no gap when an open-ended rule covers everything above the lowest bound', async () => {
    const svc = makeService([
      { id: 'r1', transactionType: 'PurchaseOrder', amountFrom: 0, amountTo: null, status: 'ACTIVE' },
    ]);
    const out = await svc.analyzeRules('PurchaseOrder');
    expect(out.gaps).toEqual([]);
  });
});
