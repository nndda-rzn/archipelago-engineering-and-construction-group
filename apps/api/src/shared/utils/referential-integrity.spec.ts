import { findOrphanApprovalTasks, SUPPORTED_TRANSACTION_TYPES } from './referential-integrity';

describe('findOrphanApprovalTasks', () => {
  const exists = (ids: string[]) => {
    const set = new Set(ids);
    return (_type: string, id: string) => set.has(id);
  };

  it('flags a task whose transactionId is not a real document id (the seed bug)', () => {
    // Inilah bug yang terjadi: transactionId dikarang, bukan CUID dokumen.
    const tasks = [
      { id: 't1', transactionType: 'PurchaseRequisition', transactionId: 'PurchaseRequisition-PR-2026-EPC-900002' },
      { id: 't2', transactionType: 'PurchaseRequisition', transactionId: 'cmuy-real-cuid' },
    ];
    const orphans = findOrphanApprovalTasks(tasks, exists(['cmuy-real-cuid']));
    expect(orphans.map((o) => o.id)).toEqual(['t1']);
  });

  it('treats a task pointing at a real document as healthy', () => {
    const tasks = [{ id: 't1', transactionType: 'PurchaseOrder', transactionId: 'po-1' }];
    expect(findOrphanApprovalTasks(tasks, exists(['po-1']))).toEqual([]);
  });

  it('can skip unsupported transaction types when asked', () => {
    const tasks = [{ id: 't1', transactionType: 'Budget', transactionId: 'anything' }];
    // Tanpa filter: 'Budget' tidak terverifikasi → dianggap yatim.
    expect(findOrphanApprovalTasks(tasks, exists([]))).toHaveLength(1);
    // Dengan filter: dilewati karena kita tidak punya tabel sumbernya.
    expect(findOrphanApprovalTasks(tasks, exists([]), { onlySupportedType: true })).toHaveLength(0);
  });

  it('exposes exactly the two transaction types the evaluator supports', () => {
    expect([...SUPPORTED_TRANSACTION_TYPES]).toEqual(['PurchaseRequisition', 'PurchaseOrder']);
  });
});
