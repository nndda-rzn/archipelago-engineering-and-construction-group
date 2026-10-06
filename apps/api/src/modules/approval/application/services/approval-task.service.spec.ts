import { BadRequestException } from '@nestjs/common';
import { ApprovalTaskService } from './approval-task.service';
import { ConditionEvaluator } from './shared/condition-evaluator';

/**
 * Mock prisma minimal: hanya method yang benar-benar dipakai service. Tipenya
 * sengaja longgar karena tiap test mengganti sebagian model dengan objek lebih
 * kecil; service di-construct dengan `as never`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock test yang diganti sebagian per-kasus
function makePrisma(overrides: Record<string, unknown> = {}): any {
  return {
    approvalTask: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 't1', status: 'APPROVED' }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'task-new', ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    workflowDefinition: { findFirst: jest.fn().mockResolvedValue(null) },
    userRole: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue({ userId: 'approver-1' }) },
    role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1', code: 'PROCUREMENT_MANAGER' }) },
    purchaseRequisition: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({}) },
    purchaseOrder: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({}) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(undefined)),
    ...overrides,
  };
}

function makeService(prisma: unknown) {
  const evaluator = new ConditionEvaluator(prisma as never);
  return new ApprovalTaskService(prisma as never, { record: jest.fn() } as never, evaluator);
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
        findFirst: jest.fn().mockResolvedValue(null),
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

describe('ApprovalTaskService.submitForApproval — rantai berjenjang', () => {
  function chainPrisma() {
    const prisma = makePrisma();
    prisma.purchaseOrder = {
      findUnique: jest.fn().mockResolvedValue({ id: 'po1', status: 'DRAFT', totalAmount: 150_000_000 }),
      update: jest.fn().mockResolvedValue({}),
    };
    prisma.workflowDefinition = {
      findFirst: jest.fn().mockResolvedValue({
        code: 'PO_APPROVAL',
        version: 1,
        steps: [
          { stepOrder: 1, name: 'Approval Manager Pengadaan', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
          { stepOrder: 2, name: 'Approval Direksi', approverRoleCode: 'SUPER_ADMIN', conditionField: 'totalAmount', conditionOp: '>', conditionValue: 5_000_000 },
        ],
      }),
    };
    prisma.role = { findUnique: jest.fn().mockResolvedValue({ id: 'role-1', code: 'PROCUREMENT_MANAGER' }) };
    prisma.userRole = { findFirst: jest.fn().mockResolvedValue({ userId: 'approver-1' }) };
    prisma.approvalTask = {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'task-1', ...data })),
    };
    prisma.$transaction = jest.fn((cb: (t: unknown) => unknown) => cb(prisma));
    return prisma;
  }

  it('creates the FIRST applicable step, not a single arbitrary one', async () => {
    const prisma = chainPrisma();
    const svc = makeService(prisma);
    await svc.submitForApproval({ transactionType: 'PurchaseOrder', transactionId: 'po1', transactionCode: 'PO-1', approverRoleCode: 'IGNORED' }, 'u1');

    const created = prisma.approvalTask.create.mock.calls[0]![0].data;
    expect(created.stepOrder).toBe(1);
    expect(created.stepName).toBe('Approval Manager Pengadaan');
    expect(created.approverRoleCode).toBe('PROCUREMENT_MANAGER');
    // Dokumen tetap SUBMITTED (belum APPROVED) selama masih ada langkah lanjutan.
    expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SUBMITTED' }) }),
    );
  });

  it('skips a step whose condition does not match (small amount -> only the first step)', async () => {
    const prisma = chainPrisma();
    prisma.purchaseOrder.findUnique = jest.fn().mockResolvedValue({ id: 'po1', status: 'DRAFT', totalAmount: 1_000_000 });
    prisma.approvalTask.create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'task-1', ...data }));
    const svc = makeService(prisma);
    await svc.submitForApproval({ transactionType: 'PurchaseOrder', transactionId: 'po1', approverRoleCode: 'X' }, 'u1');

    const created = prisma.approvalTask.create.mock.calls[0]![0].data;
    expect(created.stepOrder).toBe(1);
    expect(created.approverRoleCode).toBe('PROCUREMENT_MANAGER');
    // PO 1 juta: step 2 (>5jt) TIDAK applicable -> hanya 1 task dibuat.
    expect(prisma.approvalTask.create).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: re-submitting an already-submitted document is rejected', async () => {
    const prisma = chainPrisma();
    prisma.approvalTask.findFirst = jest.fn().mockResolvedValue({ id: 'existing' });
    const svc = makeService(prisma);
    await expect(
      svc.submitForApproval({ transactionType: 'PurchaseOrder', transactionId: 'po1', approverRoleCode: 'X' }, 'u1'),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('ApprovalTaskService.decide — maju ke langkah berikutnya', () => {
  function decidePrisma(hasNextStep: boolean) {
    const prisma = makePrisma();
    prisma.approvalTask.findUnique = jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if ('transactionType_transactionId_stepOrder' in where) {
        // pencarian langkah berikutnya
        return hasNextStep
          ? { id: 'task-2', stepOrder: 2, stepName: 'Approval Direksi', approverRoleCode: 'SUPER_ADMIN', status: 'PENDING', transactionType: 'PurchaseOrder', transactionId: 'po1', requesterId: 'u-other' }
          : null;
      }
      return { id: 'task-1', stepOrder: 1, stepName: 'Approval Manager Pengadaan', status: 'PENDING', requesterId: 'u-other', approverRoleCode: 'PROCUREMENT_MANAGER', transactionType: 'PurchaseOrder', transactionId: 'po1' };
    });
    prisma.role = { findUnique: jest.fn().mockResolvedValue({ id: 'role-1', code: 'PROCUREMENT_MANAGER' }) };
    prisma.userRole = { findFirst: jest.fn().mockResolvedValue({ userId: 'approver-1' }) };
    prisma.workflowDefinition = {
      findFirst: jest.fn().mockResolvedValue({
        code: 'PO_APPROVAL',
        steps: [
          { stepOrder: 1, name: 'Approval Manager Pengadaan', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
          { stepOrder: 2, name: 'Approval Direksi', approverRoleCode: 'SUPER_ADMIN', conditionField: 'totalAmount', conditionOp: '>', conditionValue: 5_000_000 },
        ],
      }),
    };
    prisma.purchaseOrder = { findUnique: jest.fn().mockResolvedValue({ id: 'po1', status: 'SUBMITTED', totalAmount: 150_000_000 }), update: jest.fn().mockResolvedValue({}) };
    prisma.approvalTask.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.approvalTask.create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'task-2', ...data }));
    prisma.$transaction = jest.fn((cb: (t: unknown) => unknown) => cb(prisma));
    return prisma;
  }

  it('APPROVE on a non-final step opens the NEXT step and leaves the document SUBMITTED', async () => {
    const prisma = decidePrisma(true);
    const svc = makeService(prisma);
    await svc.decide({ taskId: 'task-1', decision: 'APPROVE' }, 'u1');

    expect(prisma.approvalTask.create).toHaveBeenCalledTimes(1);
    const next = prisma.approvalTask.create.mock.calls[0]![0].data;
    expect(next.stepOrder).toBe(2);
    expect(next.approverRoleCode).toBe('SUPER_ADMIN');
    // Dokumen BELUM final.
    expect(prisma.purchaseOrder.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
    );
  });

  it('opens the next step even when the same person holds the next role (maker-checker is about the requester, not the previous approver)', async () => {
    const prisma = decidePrisma(true);
    // approver-1 memegang role langkah berikutnya juga.
    prisma.userRole.findFirst = jest.fn().mockResolvedValue({ userId: 'u1' });
    const svc = makeService(prisma);
    await svc.decide({ taskId: 'task-1', decision: 'APPROVE' }, 'u1');

    expect(prisma.approvalTask.create).toHaveBeenCalledTimes(1);
    expect(prisma.approvalTask.create.mock.calls[0]![0].data.stepOrder).toBe(2);
  });

  it('APPROVE on the FINAL step marks the document APPROVED and creates no further task', async () => {
    const prisma = decidePrisma(false);
    prisma.approvalTask.findUnique = jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if ('transactionType_transactionId_stepOrder' in where) return null;
      return { id: 'task-2', stepOrder: 2, stepName: 'Approval Direksi', status: 'PENDING', requesterId: 'u-other', approverRoleCode: 'SUPER_ADMIN', transactionType: 'PurchaseOrder', transactionId: 'po1' };
    });
    prisma.role = { findUnique: jest.fn().mockResolvedValue({ id: 'role-dir', code: 'SUPER_ADMIN' }) };
    const svc = makeService(prisma);
    await svc.decide({ taskId: 'task-2', decision: 'APPROVE' }, 'u1');

    expect(prisma.approvalTask.create).not.toHaveBeenCalled();
    expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
    );
  });

  it('REJECT cancels the remaining pending tasks of the same document', async () => {
    const prisma = decidePrisma(true);
    const svc = makeService(prisma);
    await svc.decide({ taskId: 'task-1', decision: 'REJECT', comment: 'Budget exceeded' }, 'u1');

    expect(prisma.approvalTask.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ transactionType: 'PurchaseOrder', transactionId: 'po1', status: 'PENDING' }),
        data: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    );
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
