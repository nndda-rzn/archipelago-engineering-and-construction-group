import { ApprovalQueueService } from './approval-queue.service';
import { RoleAssignmentLookup } from './shared/role-assignment.lookup';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock test: model diganti sebagian
function makePrisma(overrides: Record<string, unknown> = {}): any {
  return {
    approvalTask: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    userRole: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
    role: { findUnique: jest.fn().mockResolvedValue(null) },
    purchaseRequisition: { findMany: jest.fn().mockResolvedValue([]) },
    purchaseOrder: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

function makeService(prisma: unknown) {
  return new ApprovalQueueService(prisma as never, new RoleAssignmentLookup(prisma as never));
}

describe('ApprovalQueueService.listTasks — filter antrean + counts', () => {
  it('applies status/type/q filters and returns per-status counts', async () => {
    const prisma = makePrisma();
    prisma.approvalTask.groupBy = jest.fn().mockResolvedValue([
      { status: 'PENDING', _count: { _all: 12 } },
      { status: 'APPROVED', _count: { _all: 40 } },
      { status: 'REJECTED', _count: { _all: 3 } },
    ]);

    const res = await makeService(prisma).listTasks('u1', { status: 'PENDING', type: 'PurchaseRequisition', q: 'PR-2027', page: 1, pageSize: 20 });

    const where = prisma.approvalTask.findMany.mock.calls[0]![0].where;
    expect(where.status).toBe('PENDING');
    expect(where.transactionType).toBe('PurchaseRequisition');
    expect(JSON.stringify(where.transactionCode)).toContain('PR-2027');
    expect(res.counts).toEqual({ PENDING: 12, APPROVED: 40, REJECTED: 3, ALL: 55 });
  });

  it('"mine" restricts to tasks the actor may approve (role + not own + pending)', async () => {
    const prisma = makePrisma();
    prisma.userRole.findMany = jest.fn().mockResolvedValue([{ role: { code: 'PROCUREMENT_MANAGER' } }]);
    prisma.approvalTask.groupBy = jest.fn().mockResolvedValue([]);

    await makeService(prisma).listTasks('u1', { mine: true, page: 1, pageSize: 20 });

    const where = prisma.approvalTask.findMany.mock.calls[0]![0].where;
    expect(where.status).toBe('PENDING');
    expect(where.requesterId).toEqual({ not: 'u1' });
    expect(where.approverRoleCode).toEqual({ in: ['PROCUREMENT_MANAGER'] });
  });
});

describe('ApprovalQueueService.pendingCount', () => {
  it('counts PENDING tasks', async () => {
    const prisma = makePrisma();
    prisma.approvalTask.count = jest.fn().mockResolvedValue(7);
    await expect(makeService(prisma).pendingCount()).resolves.toBe(7);
  });
});

describe('ApprovalQueueService.enrichQueue', () => {
  it('adds project/amount/requester context and canApprove', async () => {
    const prisma = makePrisma();
    prisma.approvalTask.findMany = jest.fn().mockResolvedValue([
      { id: 't1', status: 'PENDING', requesterId: 'u-other', approverRoleCode: 'PROCUREMENT_MANAGER', transactionType: 'PurchaseOrder', transactionId: 'po1', createdAt: 'x' },
    ]);
    prisma.purchaseOrder.findMany = jest.fn().mockResolvedValue([
      { id: 'po1', totalAmount: 100, project: { code: 'PRJ-1', name: 'Tower' } },
    ]);
    prisma.user.findMany = jest.fn().mockResolvedValue([{ id: 'u-other', displayName: 'Budi' }]);
    prisma.userRole.findMany = jest.fn().mockResolvedValue([{ role: { code: 'PROCUREMENT_MANAGER' } }]);

    const res = await makeService(prisma).listTasks('u1', { mine: true, page: 1, pageSize: 20 });
    expect(res.items[0]).toMatchObject({ projectCode: 'PRJ-1', projectName: 'Tower', amount: 100, requesterName: 'Budi', canApprove: true });
  });
});
