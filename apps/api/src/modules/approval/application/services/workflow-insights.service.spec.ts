import { WorkflowInsightsService } from './workflow-insights.service';
import { ConditionEvaluator } from './shared/condition-evaluator';

/**
 * Mock prisma minimal. Tipe longgar karena tiap test mengganti sebagian model
 * dengan objek yang lebih kecil.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock test
function makePrisma(overrides: Record<string, unknown> = {}): any {
  return {
    workflowDefinition: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'def-1',
        code: 'PR_APPROVAL',
        transactionType: 'PurchaseRequisition',
        steps: [
          { stepOrder: 1, name: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
          { stepOrder: 2, name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 },
        ],
      }),
    },
    approvalTask: { findMany: jest.fn().mockResolvedValue([]) },
    role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1', code: 'SUPER_ADMIN' }) },
    userRole: {
      findMany: jest.fn().mockResolvedValue([
        { user: { displayName: 'AEC Administrator' } },
        { user: { displayName: 'CFO Demo' } },
      ]),
    },
    purchaseRequisition: {
      findMany: jest.fn().mockResolvedValue([
        { estimatedTotal: 2_000_000 },
        { estimatedTotal: 150_000_000_000 },
      ]),
    },
    purchaseOrder: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

function makeService(prisma: unknown) {
  const evaluator = new ConditionEvaluator(prisma as never);
  return new WorkflowInsightsService(prisma as never, evaluator);
}

describe('WorkflowInsightsService: coverage menyebut orangnya', () => {
  it('returns holder names, not only the count', async () => {
    const svc = makeService(makePrisma());
    const result = await svc.forDefinition('def-1');
    expect(result.coverage[0]!.holderNames).toEqual(['AEC Administrator', 'CFO Demo']);
    expect(result.coverage[0]!.holders).toBe(2);
  });

  it('keeps holders consistent with the number of names', async () => {
    const svc = makeService(makePrisma());
    const result = await svc.forDefinition('def-1');
    for (const c of result.coverage) {
      expect(c.holders).toBe(c.holderNames.length);
    }
  });

  it('reports an empty name list when a role has no holder', async () => {
    const svc = makeService(makePrisma({ userRole: { findMany: jest.fn().mockResolvedValue([]) } }));
    const result = await svc.forDefinition('def-1');
    expect(result.coverage[0]).toEqual({ stepOrder: 1, roleCode: 'PROCUREMENT_MANAGER', holders: 0, holderNames: [] });
  });
});

describe('WorkflowInsightsService: ambang untuk garis pada grafik', () => {
  it('exposes the threshold of every conditional step', async () => {
    const svc = makeService(makePrisma());
    const result = await svc.forDefinition('def-1');
    expect(result.thresholds).toEqual([
      { stepOrder: 2, stepName: 'Board approval', field: 'estimatedTotal', op: '>', value: 5_000_000 },
    ]);
  });

  it('does not report a threshold for a step that always applies', async () => {
    const svc = makeService(makePrisma());
    const result = await svc.forDefinition('def-1');
    expect(result.thresholds.some((t) => t.stepOrder === 1)).toBe(false);
  });
});

describe('WorkflowInsightsService: bucket membawa batasnya', () => {
  it('sends numeric bounds so the client does not guess them from the label', async () => {
    const svc = makeService(makePrisma());
    const result = await svc.forDefinition('def-1');
    // Setiap bucket membawa batasnya sendiri, bukan hanya yang pertama.
    expect(result.amounts.buckets.map((b) => [b.from, b.to])).toEqual([
      [0, 10_000_000],
      [10_000_000, 100_000_000],
      [100_000_000, 1_000_000_000],
      [1_000_000_000, 10_000_000_000],
      [10_000_000_000, null],
    ]);
  });
});
