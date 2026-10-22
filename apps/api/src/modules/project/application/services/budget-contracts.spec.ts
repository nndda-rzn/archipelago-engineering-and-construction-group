import { budgetSummarySchema, costTypeKeySchema, upsertBudgetSchema } from '@aec/api-contracts';

/**
 * Kontrak budget diparse di sini karena `packages/api-contracts` tidak punya test
 * runner sendiri (pola sama dengan `analytics-contracts.spec.ts`). Paket ini
 * diimpor runtime oleh web & api, jadi memvalidasinya dari suite API tetap
 * menguji kontrak nyata.
 */
describe('budget contracts', () => {
  it('requires costType instead of defaulting to DIRECT', () => {
    // Regresi: `costType` dulu opsional dan service jatuh ke 'DIRECT', sehingga
    // setiap penyuntingan dari UI membuat baris kelima di samping 4 cost type
    // yang sudah ada.
    expect(upsertBudgetSchema.safeParse({ wbsItemId: 'w1', amount: 100 }).success).toBe(false);
    expect(upsertBudgetSchema.safeParse({ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }).success).toBe(true);
  });

  it('rejects an unknown cost type', () => {
    expect(upsertBudgetSchema.safeParse({ wbsItemId: 'w1', costType: 'NOPE', amount: 1 }).success).toBe(false);
  });

  it('accepts every cost type the schema declares', () => {
    for (const key of costTypeKeySchema.options) {
      expect(upsertBudgetSchema.safeParse({ wbsItemId: 'w1', costType: key, amount: 1 }).success).toBe(true);
    }
  });

  it('parses a node carrying rollup, cost breakdown and spend', () => {
    const parsed = budgetSummarySchema.parse({
      projectId: 'p1',
      status: 'PUBLISHED',
      wbs: [
        {
          id: 'w1', code: '1', name: 'Engineering', parentId: null, depth: 0,
          budget: 1000, used: 400, remaining: 600,
          byCostType: { LABOR: 600, MATERIAL: 400 },
          plannedValue: 0, itemCount: 2, childrenCount: 0,
        },
      ],
      totalBudget: 1000,
      totals: { budget: 1000, used: 400, remaining: 600, contractValue: 1200, variance: 200 },
      warnings: { overContract: false, overAllocated: [], noBudget: [], pvMismatch: null },
      costCoverage: { allocatedNodes: 1, totalNodes: 1 },
    });
    expect(parsed.wbs[0]!.used).toBe(400);
    expect(parsed.wbs[0]!.byCostType).toEqual({ LABOR: 600, MATERIAL: 400 });
  });

  it('accepts a negative remaining and a pvMismatch payload', () => {
    // Over-allocation harus bisa direpresentasikan, bukan dijepit ke 0.
    const parsed = budgetSummarySchema.parse({
      projectId: 'p1',
      status: 'DRAFT',
      wbs: [
        {
          id: 'w1', code: '1', name: 'Engineering', parentId: null, depth: 0,
          budget: 100, used: 150, remaining: -50,
          byCostType: { LABOR: 100 },
          plannedValue: 60, itemCount: 1, childrenCount: 0,
        },
      ],
      totalBudget: 100,
      totals: { budget: 100, used: 150, remaining: -50, contractValue: 80, variance: -20 },
      warnings: {
        overContract: true,
        overAllocated: [{ wbsId: 'w1', code: '1', amount: 50 }],
        noBudget: [],
        pvMismatch: { pv: 60, bac: 100, ratio: 0.6 },
      },
      costCoverage: { allocatedNodes: 1, totalNodes: 1 },
    });
    expect(parsed.wbs[0]!.remaining).toBe(-50);
    expect(parsed.warnings.pvMismatch?.ratio).toBeCloseTo(0.6, 2);
  });

  it('rejects a node missing the rollup fields', () => {
    expect(budgetSummarySchema.safeParse({
      projectId: 'p1',
      status: 'DRAFT',
      wbs: [{ id: 'w1', code: '1', name: 'Engineering', parentId: null, budget: 100, itemCount: 1 }],
      totalBudget: 100,
    }).success).toBe(false);
  });
});

