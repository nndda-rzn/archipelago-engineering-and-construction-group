import { describe, expect, it } from 'vitest';
import { budgetStatementSchema } from '@aec/api-contracts';

/**
 * Penjaga kontrak di sisi klien: memastikan bentuk pohon lama tidak lagi
 * diterima. Tanpa ini, API yang belum di-deploy bisa lolos parse dan halaman
 * menampilkan sel kosong tanpa error yang jelas.
 */
describe('budget statement contract on the client', () => {
  it('rejects the old tree shape so a stale API cannot slip through', () => {
    const oldShape = {
      projectId: 'p1', status: 'DRAFT', wbs: [],
      totalBudget: 0, totals: { budget: 0, used: 0, remaining: 0, contractValue: 0, variance: 0 },
      warnings: {}, costCoverage: { allocatedNodes: 0, totalNodes: 0 },
    };
    expect(budgetStatementSchema.safeParse(oldShape).success).toBe(false);
  });

  it('accepts a statement payload', () => {
    const statement = {
      projectId: 'p1', currency: 'IDR', baseline: null, previous: null, rows: [],
      totals: {
        baseline: 0, revised: 0, committed: 0, actual: 0, available: 0,
        variance: 0, varianceBaseline: 0, contractValue: 0, eac: null, vac: null,
      },
      unallocated: { committed: 0, actual: 0 },
      reconciliation: { ledgerOut: 0, journalExpense610: 0, doubleCountRisk: false },
      warnings: {
        overContract: false, overCommitted: [], noBudget: [],
        pvCoverage: { pv: 0, bac: 0, status: 'NO_BASELINE' },
      },
      costCoverage: { allocatedNodes: 0, totalNodes: 0 },
    };
    expect(budgetStatementSchema.safeParse(statement).success).toBe(true);
  });
});
