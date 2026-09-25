import { ApprovalTaskService } from './approval-task.service';
import type { ApproveTaskDto, SubmitForApprovalDto } from '../../presentation/dto/approval.dto';

async function expectCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    fail(`expected rejection with code ${code}`);
  } catch (e: unknown) {
    const anyE = e as { getResponse?: () => unknown; code?: string; message?: string };
    const body = anyE.getResponse?.() as { code?: string };
    const got = body?.code ?? anyE.code;
    expect(got).toBe(code);
  }
}

const PLAN_2_STEP = [
  { stepOrder: 1, name: 'Manager', approverRoleCode: 'MANAGER' },
  { stepOrder: 2, name: 'Direksi', approverRoleCode: 'DIRECTOR' },
];

describe('ApprovalTaskService (multi-step + state machine + BR-003)', () => {
  let service: ApprovalTaskService;
  const audit = { record: jest.fn() };

  interface PrismaMock {
    role: { findUnique: jest.Mock };
    userRole: { findFirst: jest.Mock };
    workflowDefinition: { findFirst: jest.Mock };
    approvalTask: { findUnique: jest.Mock };
    approvalInstance: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;

  const evaluator = {
    getTransaction: jest.fn(),
    getDocValue: jest.fn().mockReturnValue(null),
    evaluateCondition: jest.fn().mockReturnValue(true),
    updateTransactionStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      role: { findUnique: jest.fn() },
      userRole: { findFirst: jest.fn() },
      workflowDefinition: { findFirst: jest.fn().mockResolvedValue(null) },
      approvalTask: { findUnique: jest.fn() },
      approvalInstance: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    evaluator.getDocValue.mockReturnValue(null);
    evaluator.evaluateCondition.mockReturnValue(true);
    service = new ApprovalTaskService(prisma as never, audit as never, evaluator as never);
  });

  const submitDto = (over: Partial<SubmitForApprovalDto> = {}): SubmitForApprovalDto => ({
    transactionType: 'PurchaseRequisition',
    transactionId: 'pr-1',
    approverRoleCode: 'MANAGER',
    ...over,
  });

  const decideDto = (over: Partial<ApproveTaskDto> = {}): ApproveTaskDto => ({
    taskId: 'task-1',
    decision: 'APPROVE',
    ...over,
  });

  /** Dua user berbeda: role MANAGER -> u-mgr, DIRECTOR -> u-dir. */
  const primeRoles = () => {
    prisma.role.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({ id: `role-${where.code}` }),
    );
  };

  const primeWorkflow = (steps: typeof PLAN_2_STEP) => {
    prisma.workflowDefinition.findFirst.mockResolvedValue({
      id: 'wf-1', version: 1, code: 'PR_APPROVAL',
      steps: steps.map((s) => ({ ...s, conditionField: null, conditionOp: null, conditionValue: null })),
    });
  };

  describe('submitForApproval', () => {
    it('transaksi tidak ditemukan -> NotFound TRANSACTION_NOT_FOUND', async () => {
      evaluator.getTransaction.mockResolvedValue(null);
      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'TRANSACTION_NOT_FOUND');
    });

    it('status bukan DRAFT -> Conflict NOT_DRAFT', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'APPROVED' });
      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'NOT_DRAFT');
    });

    it('definisi tanpa step yang berlaku -> Conflict NO_APPLICABLE_STEP', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'DRAFT' });
      primeWorkflow(PLAN_2_STEP);
      evaluator.evaluateCondition.mockReturnValue(false);
      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'NO_APPLICABLE_STEP');
    });

    it('validasi approver tiap step saat submit: role tidak ada -> ROLE_NOT_FOUND', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'DRAFT' });
      primeWorkflow(PLAN_2_STEP);
      prisma.role.findUnique.mockResolvedValue(null);
      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'ROLE_NOT_FOUND');
    });

    it('step kedua dinilai lebih dulu gagal -> NO_APPROVER, tidak menyentuh instance', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'DRAFT' });
      primeWorkflow(PLAN_2_STEP);
      primeRoles();
      // MANAGER punya approver, DIRECTOR tidak -> submit harus gagal (fail fast).
      prisma.userRole.findFirst.mockImplementation(({ where }: { where: { roleId: string } }) =>
        Promise.resolve(where.roleId === 'role-MANAGER' ? { userId: 'u-mgr' } : null),
      );
      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'NO_APPROVER');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('requester = approver -> Conflict MAKER_CHECKER (BR-003)', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'DRAFT' });
      primeWorkflow(PLAN_2_STEP);
      primeRoles();
      prisma.userRole.findFirst.mockResolvedValue({ userId: 'u-req' });
      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'MAKER_CHECKER');
    });

    it('2 step: hanya step pertama dibuat PENDING + stepPlan tersimpan + transaksi SUBMITTED', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'DRAFT' });
      primeWorkflow(PLAN_2_STEP);
      primeRoles();
      prisma.userRole.findFirst.mockImplementation(({ where }: { where: { roleId: string } }) =>
        Promise.resolve(where.roleId === 'role-MANAGER' ? { userId: 'u-mgr' } : { userId: 'u-dir' }),
      );

      const tx = {
        approvalInstance: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'ai-1', status: 'PENDING', currentStepOrder: 1 }),
        },
        approvalTask: { create: jest.fn().mockResolvedValue({ id: 'task-1', status: 'PENDING', stepOrder: 1 }) },
      };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      const result = await service.submitForApproval(submitDto(), 'u-req');

      expect(tx.approvalInstance.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({
          transactionType: 'PurchaseRequisition', transactionId: 'pr-1', status: 'PENDING',
          currentStepOrder: 1, definitionId: 'wf-1', definitionVersion: 1,
        }) }),
      );
      const plan = (tx.approvalInstance.create.mock.calls[0][0].data as { stepPlan: Array<{ stepOrder: number }> }).stepPlan;
      expect(plan.map((s) => s.stepOrder)).toEqual([1, 2]);
      // Hanya satu task (step 1) yang dibuat saat submit.
      expect(tx.approvalTask.create).toHaveBeenCalledTimes(1);
      expect(tx.approvalTask.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ stepOrder: 1, approverRoleCode: 'MANAGER', status: 'PENDING' }) }),
      );
      expect(evaluator.updateTransactionStatus).toHaveBeenCalledWith(tx, 'PurchaseRequisition', 'pr-1', 'SUBMITTED');
      expect(result.totalSteps).toBe(2);
      expect(result.id).toBe('task-1');
    });

    it('sudah pernah submit -> Conflict ALREADY_SUBMITTED', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'DRAFT' });
      prisma.role.findUnique.mockResolvedValue({ id: 'role-MANAGER' });
      prisma.userRole.findFirst.mockResolvedValue({ userId: 'u-mgr' });

      const tx = {
        approvalInstance: { findUnique: jest.fn().mockResolvedValue({ id: 'existing' }), create: jest.fn() },
        approvalTask: { create: jest.fn() },
      };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'ALREADY_SUBMITTED');
      expect(tx.approvalTask.create).not.toHaveBeenCalled();
    });
  });

  describe('decide', () => {
    const primeTask = (over: Record<string, unknown> = {}) => {
      prisma.approvalTask.findUnique.mockResolvedValue({
        id: 'task-1', status: 'PENDING', requesterId: 'u-req', approverRoleCode: 'MANAGER',
        transactionType: 'PurchaseRequisition', transactionId: 'pr-1', transactionCode: 'PR-1',
        stepOrder: 1, instanceId: 'ai-1',
        instance: { id: 'ai-1', requesterId: 'u-req', status: 'PENDING', stepPlan: PLAN_2_STEP },
        ...over,
      });
    };

    it('task tidak ada -> NotFound TASK_NOT_FOUND', async () => {
      prisma.approvalTask.findUnique.mockResolvedValue(null);
      await expectCode(service.decide(decideDto(), 'u-appr'), 'TASK_NOT_FOUND');
    });

    it('task bukan PENDING -> Conflict TASK_NOT_PENDING', async () => {
      primeTask({ status: 'APPROVED' });
      await expectCode(service.decide(decideDto(), 'u-appr'), 'TASK_NOT_PENDING');
    });

    it('requester approve sendiri -> Conflict MAKER_CHECKER (BR-003)', async () => {
      primeTask({ requesterId: 'u-appr' });
      await expectCode(service.decide(decideDto(), 'u-appr'), 'MAKER_CHECKER');
    });

    it('actor tanpa role approver -> Forbidden NOT_APPROVER', async () => {
      primeTask();
      prisma.role.findUnique.mockResolvedValue({ id: 'role-MANAGER' });
      prisma.userRole.findFirst.mockResolvedValue(null);
      await expectCode(service.decide(decideDto(), 'u-stranger'), 'NOT_APPROVER');
    });

    it('APPROVE step 1 dari 2 -> buat task step 2, instance tetap PENDING, transaksi BELUM APPROVED', async () => {
      primeTask();
      prisma.role.findUnique.mockResolvedValue({ id: 'role-MANAGER' });
      prisma.userRole.findFirst.mockResolvedValue({ userId: 'u-mgr' });

      const tx = {
        approvalTask: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({ id: 'task-2', stepOrder: 2, status: 'PENDING' }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'task-1', status: 'APPROVED' }),
        },
        approvalInstance: { update: jest.fn() },
      };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      const result = await service.decide(decideDto(), 'u-mgr');

      expect(tx.approvalTask.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ instanceId: 'ai-1', stepOrder: 2, approverRoleCode: 'DIRECTOR', status: 'PENDING' }) }),
      );
      expect(tx.approvalInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ai-1' }, data: { currentStepOrder: 2 } }),
      );
      // Transaksi TIDAK boleh jadi APPROVED sebelum step terakhir.
      expect(evaluator.updateTransactionStatus).not.toHaveBeenCalled();
      expect(result.status).toBe('APPROVED');
      // Pemanggil menerima id task step berikutnya tanpa perlu query ulang.
      expect(result.nextTaskId).toBe('task-2');
    });

    it('APPROVE step terakhir -> instance + transaksi final APPROVED', async () => {
      primeTask({ stepOrder: 2, approverRoleCode: 'DIRECTOR' });
      prisma.role.findUnique.mockResolvedValue({ id: 'role-DIRECTOR' });
      prisma.userRole.findFirst.mockResolvedValue({ userId: 'u-dir' });

      const tx = {
        approvalTask: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn(),
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'task-1', status: 'APPROVED' }),
        },
        approvalInstance: { update: jest.fn() },
      };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      await service.decide(decideDto(), 'u-dir');

      expect(tx.approvalTask.create).not.toHaveBeenCalled();
      expect(tx.approvalInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ai-1' }, data: expect.objectContaining({ status: 'APPROVED' }) }),
      );
      expect(evaluator.updateTransactionStatus).toHaveBeenCalledWith(tx, 'PurchaseRequisition', 'pr-1', 'APPROVED');
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'APPROVAL.APPROVE' }));
    });

    it('APPROVE tapi CAS count=0 (sudah diputuskan paralel) -> TASK_NOT_PENDING, tanpa efek samping', async () => {
      primeTask();
      prisma.role.findUnique.mockResolvedValue({ id: 'role-MANAGER' });
      prisma.userRole.findFirst.mockResolvedValue({ userId: 'u-mgr' });

      const tx = {
        approvalTask: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), create: jest.fn(), findUniqueOrThrow: jest.fn() },
        approvalInstance: { update: jest.fn() },
      };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      await expectCode(service.decide(decideDto(), 'u-mgr'), 'TASK_NOT_PENDING');
      expect(tx.approvalTask.create).not.toHaveBeenCalled();
      expect(tx.approvalInstance.update).not.toHaveBeenCalled();
      expect(evaluator.updateTransactionStatus).not.toHaveBeenCalled();
    });

    it('REJECT di step 1 (masih ada step 2) -> berhenti: instance + transaksi REJECTED', async () => {
      primeTask();
      prisma.role.findUnique.mockResolvedValue({ id: 'role-MANAGER' });
      prisma.userRole.findFirst.mockResolvedValue({ userId: 'u-mgr' });

      const tx = {
        approvalTask: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn(),
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'task-1', status: 'REJECTED' }),
        },
        approvalInstance: { update: jest.fn() },
      };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      await service.decide(decideDto({ decision: 'REJECT', comment: 'budget kurang' }), 'u-mgr');

      // Reject TIDAK membuat task step berikutnya.
      expect(tx.approvalTask.create).not.toHaveBeenCalled();
      expect(tx.approvalInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ai-1' }, data: expect.objectContaining({ status: 'REJECTED' }) }),
      );
      expect(evaluator.updateTransactionStatus).toHaveBeenCalledWith(tx, 'PurchaseRequisition', 'pr-1', 'REJECTED');
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'APPROVAL.REJECT' }));
    });
  });

  describe('getInstance', () => {
    it('instance tidak ada -> NotFound INSTANCE_NOT_FOUND', async () => {
      prisma.approvalInstance = { findUnique: jest.fn().mockResolvedValue(null) } as never;
      await expectCode(service.getInstance('PurchaseRequisition', 'pr-1'), 'INSTANCE_NOT_FOUND');
    });

    it('memetakan stepPlan + task menjadi status per step dan menandai task aktif', async () => {
      prisma.approvalInstance = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ai-1', status: 'PENDING', currentStepOrder: 2, stepPlan: PLAN_2_STEP,
          tasks: [
            { id: 'task-1', stepOrder: 1, status: 'APPROVED', approverId: 'u-mgr', decidedAt: new Date('2026-09-01'), comment: 'ok' },
            { id: 'task-2', stepOrder: 2, status: 'PENDING', approverId: null, decidedAt: null, comment: null },
          ],
        }),
      } as never;

      const result = await service.getInstance('PurchaseRequisition', 'pr-1');

      expect(result.steps).toHaveLength(2);
      expect(result.steps[0]).toMatchObject({ stepOrder: 1, status: 'APPROVED', taskId: 'task-1' });
      expect(result.steps[1]).toMatchObject({ stepOrder: 2, status: 'PENDING', taskId: 'task-2' });
      expect(result.activeTaskId).toBe('task-2');
    });
  });
});
