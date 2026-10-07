import { WorkflowQueryService } from './workflow-query.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock test: model diganti sebagian
function makePrisma(overrides: Record<string, unknown> = {}): any {
  return {
    workflowDefinition: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

describe('WorkflowQueryService', () => {
  describe('listWithMeta', () => {
    it('resolves createdByName and coerces conditionValue/conditionGroup', async () => {
      const prisma = makePrisma({
        workflowDefinition: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'def-1',
              code: 'PR_APPROVAL',
              createdBy: 'u1',
              steps: [
                {
                  id: 's1',
                  stepOrder: 1,
                  conditionValue: '5000000',
                  conditionGroup: { combinator: 'AND', conditions: [{ field: 'estimatedTotal', op: '>', value: 5_000_000 }] },
                },
              ],
            },
          ]),
        },
        user: { findMany: jest.fn().mockResolvedValue([{ id: 'u1', displayName: 'AEC Administrator' }]) },
      });

      const res = await new WorkflowQueryService(prisma as never).listWithMeta();
      expect(res[0]?.createdByName).toBe('AEC Administrator');
      expect(res[0]?.steps[0]?.conditionValue).toBe(5_000_000);
      expect(res[0]?.steps[0]?.conditionGroup).toEqual({
        combinator: 'AND',
        conditions: [{ field: 'estimatedTotal', op: '>', value: 5_000_000 }],
      });
    });

    it('skips the user lookup when there are no definitions', async () => {
      const prisma = makePrisma();
      await new WorkflowQueryService(prisma as never).listWithMeta({ code: 'X' });
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getActiveDefinition', () => {
    it('returns the latest ACTIVE definition with steps ordered', async () => {
      const prisma = makePrisma();
      await new WorkflowQueryService(prisma as never).getActiveDefinition('PurchaseRequisition');
      expect(prisma.workflowDefinition.findFirst).toHaveBeenCalledWith({
        where: { transactionType: 'PurchaseRequisition', status: 'ACTIVE' },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
        orderBy: { version: 'desc' },
      });
    });
  });
});
