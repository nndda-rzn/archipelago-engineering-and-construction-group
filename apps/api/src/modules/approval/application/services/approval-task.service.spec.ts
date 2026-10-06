import { BadRequestException } from '@nestjs/common';
import { ApprovalTaskService } from './approval-task.service';

/** Mock prisma minimal: hanya method yang benar-benar dipakai service. */
function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    approvalTask: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn(),
    },
    userRole: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
    role: { findUnique: jest.fn().mockResolvedValue(null) },
    purchaseRequisition: { findMany: jest.fn().mockResolvedValue([]) },
    purchaseOrder: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(),
    ...overrides,
  };
}

function makeService(prisma: unknown) {
  const evaluator = { updateTransactionStatus: jest.fn().mockResolvedValue(undefined) };
  return new ApprovalTaskService(prisma as never, { record: jest.fn() } as never, evaluator as never);
}

describe('ApprovalTaskService.decide — reject wajib beralasan', () => {
  it('rejects a REJECT decision that carries no comment', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    await expect(svc.decide({ taskId: 't1', decision: 'REJECT' }, 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    // Tidak boleh menyentuh DB sebelum validasi lolos.
    expect(prisma.approvalTask.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a REJECT decision whose comment is only whitespace', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);
    await expect(svc.decide({ taskId: 't1', decision: 'REJECT', comment: '   ' }, 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows APPROVE without a comment (comment optional on approval)', async () => {
    const prisma = makePrisma();
    prisma.role.findUnique = jest.fn().mockResolvedValue({ id: 'role-pm', code: 'PROCUREMENT_MANAGER' });
    prisma.approvalTask.findUnique = jest.fn().mockResolvedValue({
      id: 't1',
      status: 'PENDING',
      requesterId: 'other',
      approverRoleCode: 'PROCUREMENT_MANAGER',
      transactionType: 'PurchaseRequisition',
      transactionId: 'pr1',
    });
    prisma.userRole.findFirst = jest.fn().mockResolvedValue({ id: 'ur1' });
    const tx = {
      approvalTask: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 't1', status: 'APPROVED' }),
      },
      purchaseRequisition: { update: jest.fn().mockResolvedValue({}) },
      purchaseOrder: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction = jest.fn((cb: (t: unknown) => unknown) => cb(tx));

    const svc = makeService(prisma);
    await expect(svc.decide({ taskId: 't1', decision: 'APPROVE' }, 'u1')).resolves.toMatchObject({
      status: 'APPROVED',
    });
  });
});

describe('ApprovalTaskService.bulkDecide — validasi ulang tiap task di server', () => {
  it('reports per-item results and never trusts the client list blindly', async () => {
    const prisma = makePrisma();
    // t1 = boleh (pending, bukan milik sendiri, punya role); t2 = bukan approver.
    prisma.approvalTask.findUnique = jest.fn(async ({ where }: { where: { id: string } }) =>
      where.id === 't1'
        ? { id: 't1', status: 'PENDING', requesterId: 'other', approverRoleCode: 'PROCUREMENT_MANAGER', transactionType: 'PurchaseRequisition', transactionId: 'pr1' }
        : { id: 't2', status: 'PENDING', requesterId: 'other', approverRoleCode: 'DIRECTOR', transactionType: 'PurchaseOrder', transactionId: 'po1' },
    );
    // actor hanya punya PROCUREMENT_MANAGER
    prisma.userRole.findFirst = jest.fn(async ({ where }: { where: { roleId?: string } }) =>
      where.roleId === 'role-pm' ? { id: 'ur1' } : null,
    );
    prisma.role.findUnique = jest.fn(async ({ where }: { where: { code: string } }) =>
      where.code === 'PROCUREMENT_MANAGER' ? { id: 'role-pm', code: 'PROCUREMENT_MANAGER' } : { id: 'role-dir', code: 'DIRECTOR' },
    );
    const tx = {
      approvalTask: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 't1', status: 'APPROVED' }),
      },
      purchaseRequisition: { update: jest.fn().mockResolvedValue({}) },
      purchaseOrder: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction = jest.fn((cb: (t: unknown) => unknown) => cb(tx));

    const svc = makeService(prisma);
    const res = await svc.bulkDecide({ taskIds: ['t1', 't2'], decision: 'APPROVE' }, 'u1');

    expect(res.succeeded).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.results.find((r) => r.taskId === 't1')?.ok).toBe(true);
    expect(res.results.find((r) => r.taskId === 't2')?.ok).toBe(false);
    expect(res.results.find((r) => r.taskId === 't2')?.code).toBe('NOT_APPROVER');
  });

  it('rejects a bulk REJECT without a reason', async () => {
    const svc = makeService(makePrisma());
    await expect(svc.bulkDecide({ taskIds: ['t1'], decision: 'REJECT' }, 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('ApprovalTaskService.listTasks — filter antrean + counts', () => {
  it('applies status/type/q filters and returns per-status counts', async () => {
    const prisma = makePrisma();
    prisma.userRole.findMany = jest.fn().mockResolvedValue([]);
    prisma.approvalTask.groupBy = jest.fn().mockResolvedValue([
      { status: 'PENDING', _count: { _all: 12 } },
      { status: 'APPROVED', _count: { _all: 40 } },
      { status: 'REJECTED', _count: { _all: 3 } },
    ]);

    const svc = makeService(prisma);
    const res = await svc.listTasks('u1', { status: 'PENDING', type: 'PurchaseRequisition', q: 'PR-2027', page: 1, pageSize: 20 });

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

    const svc = makeService(prisma);
    await svc.listTasks('u1', { mine: true, page: 1, pageSize: 20 });

    const where = prisma.approvalTask.findMany.mock.calls[0]![0].where;
    expect(where.status).toBe('PENDING');
    expect(where.requesterId).toEqual({ not: 'u1' });
    expect(where.approverRoleCode).toEqual({ in: ['PROCUREMENT_MANAGER'] });
  });
});
