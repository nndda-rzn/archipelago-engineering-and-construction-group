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

describe('ApprovalTaskService (state machine + BR-003)', () => {
  let service: ApprovalTaskService;
  const audit = { record: jest.fn() };

  interface PrismaMock {
    role: { findUnique: jest.Mock };
    userRole: { findFirst: jest.Mock };
    workflowDefinition: { findFirst: jest.Mock };
    approvalTask: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  }
  let prisma: PrismaMock;

  const evaluator = {
    getTransaction: jest.fn(),
    getDocValue: jest.fn(),
    evaluateCondition: jest.fn(),
    updateTransactionStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      role: { findUnique: jest.fn() },
      userRole: { findFirst: jest.fn() },
      workflowDefinition: { findFirst: jest.fn() },
      approvalTask: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
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

  describe('submitForApproval', () => {
    it('transaksi tidak ditemukan -> NotFound TRANSACTION_NOT_FOUND', async () => {
      evaluator.getTransaction.mockResolvedValue(null);
      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'TRANSACTION_NOT_FOUND');
    });

    it('status bukan DRAFT -> Conflict NOT_DRAFT', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'APPROVED' });
      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'NOT_DRAFT');
    });

    it('role approver tidak ada -> NotFound ROLE_NOT_FOUND', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'DRAFT' });
      prisma.workflowDefinition.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue(null);
      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'ROLE_NOT_FOUND');
    });

    it('tidak ada user dengan role -> Conflict NO_APPROVER', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'DRAFT' });
      prisma.workflowDefinition.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 'role-mgr' });
      prisma.userRole.findFirst.mockResolvedValue(null);
      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'NO_APPROVER');
    });

    it('requester = approver -> Conflict MAKER_CHECKER (BR-003)', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'DRAFT' });
      prisma.workflowDefinition.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 'role-mgr' });
      prisma.userRole.findFirst.mockResolvedValue({ userId: 'u-req' });
      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'MAKER_CHECKER');
    });

    it('sudah pernah submit -> Conflict ALREADY_SUBMITTED', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'DRAFT' });
      prisma.workflowDefinition.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 'role-mgr' });
      prisma.userRole.findFirst.mockResolvedValue({ userId: 'u-appr' });

      const tx = {
        approvalTask: {
          findUnique: jest.fn().mockResolvedValue({ id: 'existing' }),
          create: jest.fn(),
        },
        purchaseRequisition: { update: jest.fn() },
      };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      await expectCode(service.submitForApproval(submitDto(), 'u-req'), 'ALREADY_SUBMITTED');
      expect(tx.approvalTask.create).not.toHaveBeenCalled();
    });

    it('valid -> approvalTask.create PENDING + transaksi jadi SUBMITTED dalam 1 tx', async () => {
      evaluator.getTransaction.mockResolvedValue({ id: 'pr-1', status: 'DRAFT' });
      prisma.workflowDefinition.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 'role-mgr' });
      prisma.userRole.findFirst.mockResolvedValue({ userId: 'u-appr' });

      const tx = {
        approvalTask: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'task-1', status: 'PENDING' }),
        },
        purchaseRequisition: { update: jest.fn().mockResolvedValue({ id: 'pr-1', status: 'SUBMITTED' }) },
      };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      const task = await service.submitForApproval(submitDto(), 'u-req');

      expect(tx.approvalTask.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', requesterId: 'u-req', approverRoleCode: 'MANAGER' }) }),
      );
      expect(evaluator.updateTransactionStatus).toHaveBeenCalledWith(tx, 'PurchaseRequisition', 'pr-1', 'SUBMITTED');
      expect(task.status).toBe('PENDING');
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'APPROVAL.SUBMIT' }));
    });
  });

  describe('decide', () => {
    it('task tidak ada -> NotFound TASK_NOT_FOUND', async () => {
      prisma.approvalTask.findUnique.mockResolvedValue(null);
      await expectCode(service.decide(decideDto(), 'u-appr'), 'TASK_NOT_FOUND');
    });

    it('task bukan PENDING -> Conflict TASK_NOT_PENDING', async () => {
      prisma.approvalTask.findUnique.mockResolvedValue({ id: 'task-1', status: 'APPROVED' });
      await expectCode(service.decide(decideDto(), 'u-appr'), 'TASK_NOT_PENDING');
    });

    it('requester approve sendiri -> Conflict MAKER_CHECKER (BR-003)', async () => {
      prisma.approvalTask.findUnique.mockResolvedValue({ id: 'task-1', status: 'PENDING', requesterId: 'u-appr', approverRoleCode: 'MANAGER' });
      await expectCode(service.decide(decideDto(), 'u-appr'), 'MAKER_CHECKER');
    });

    it('actor tanpa role approver -> Forbidden NOT_APPROVER', async () => {
      prisma.approvalTask.findUnique.mockResolvedValue({ id: 'task-1', status: 'PENDING', requesterId: 'u-req', approverRoleCode: 'MANAGER' });
      prisma.role.findUnique.mockResolvedValue({ id: 'role-mgr' });
      prisma.userRole.findFirst.mockResolvedValue(null);
      await expectCode(service.decide(decideDto(), 'u-stranger'), 'NOT_APPROVER');
    });

    it('APPROVE -> status APPROVED + transaksi APPROVED', async () => {
      prisma.approvalTask.findUnique.mockResolvedValue({ id: 'task-1', status: 'PENDING', requesterId: 'u-req', approverRoleCode: 'MANAGER', transactionType: 'PurchaseRequisition', transactionId: 'pr-1' });
      prisma.role.findUnique.mockResolvedValue({ id: 'role-mgr' });
      prisma.userRole.findFirst.mockResolvedValue({ userId: 'u-appr' });

      const tx = { approvalTask: { update: jest.fn().mockResolvedValue({ id: 'task-1', status: 'APPROVED' }) }, purchaseRequisition: { update: jest.fn() } };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      const result = await service.decide(decideDto({ decision: 'APPROVE' }), 'u-appr');

      expect(tx.approvalTask.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED', approverId: 'u-appr' }) }));
      expect(evaluator.updateTransactionStatus).toHaveBeenCalledWith(tx, 'PurchaseRequisition', 'pr-1', 'APPROVED');
      expect(result.status).toBe('APPROVED');
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'APPROVAL.APPROVE' }));
    });

    it('REJECT -> status REJECTED + transaksi REJECTED', async () => {
      prisma.approvalTask.findUnique.mockResolvedValue({ id: 'task-1', status: 'PENDING', requesterId: 'u-req', approverRoleCode: 'MANAGER', transactionType: 'PurchaseRequisition', transactionId: 'pr-1' });
      prisma.role.findUnique.mockResolvedValue({ id: 'role-mgr' });
      prisma.userRole.findFirst.mockResolvedValue({ userId: 'u-appr' });

      const tx = { approvalTask: { update: jest.fn().mockResolvedValue({ id: 'task-1', status: 'REJECTED' }) }, purchaseRequisition: { update: jest.fn() } };
      prisma.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

      const result = await service.decide(decideDto({ decision: 'REJECT', comment: 'budget kurang' }), 'u-appr');

      expect(tx.approvalTask.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED', comment: 'budget kurang' }) }));
      expect(evaluator.updateTransactionStatus).toHaveBeenCalledWith(tx, 'PurchaseRequisition', 'pr-1', 'REJECTED');
      expect(result.status).toBe('REJECTED');
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'APPROVAL.REJECT' }));
    });
  });
});
