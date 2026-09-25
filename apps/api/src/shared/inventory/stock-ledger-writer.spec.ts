import { StockLedgerWriter, type LedgerLine } from './stock-ledger-writer';

describe('StockLedgerWriter', () => {
  const line = (movementType: LedgerLine['movementType'], quantity: number): LedgerLine => ({
    projectId: 'project-1', wbsItemId: 'wbs-1', warehouseId: 'warehouse-1',
    documentType: movementType, documentId: movementType, reference: 'document-1',
    description: 'material', movementType, quantity, unit: 'EA',
    unitPrice: 2, totalValue: 2 * quantity,
  });

  it('persists signed movement quantities and matching running balances for IN/OUT/transfers', async () => {
    const tx = {
      stockLedgerEntry: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 10 } }),
        createMany: jest.fn().mockResolvedValue({ count: 4 }),
      },
    };
    const writer = new StockLedgerWriter({} as never);

    await writer.write(tx as never, [
      line('IN', 2), line('OUT', 3), line('TRANSFER_OUT', 4), line('TRANSFER_IN', 4),
    ]);

    expect(tx.stockLedgerEntry.aggregate).toHaveBeenCalledTimes(1);
    const rows = tx.stockLedgerEntry.createMany.mock.calls[0][0].data;
    expect(rows.map((row: { quantity: number }) => row.quantity)).toEqual([2, -3, -4, 4]);
    expect(rows.map((row: { balanceAfter: string }) => row.balanceAfter)).toEqual(['12', '9', '5', '9']);
  });
});
