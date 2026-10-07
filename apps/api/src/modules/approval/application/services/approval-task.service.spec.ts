import { ApprovalTaskService } from './approval-task.service';
import type { ApprovalWorkflowEngine } from './approval-workflow-engine.service';
import type { ApprovalQueueService } from './approval-queue.service';
import type { ApprovalDetailService } from './approval-detail.service';

/**
 * Facade hanya mendelegasikan: tidak ada logika di sini. Test ini menjaga
 * permukaan publik yang dipakai `ApprovalController` tetap ada dan tetap
 * meneruskan argumen ke sub-service yang benar. Detail perilaku diuji di spec
 * masing-masing sub-service.
 */
function makeFacade() {
  const engine = { submitForApproval: jest.fn(), decide: jest.fn(), bulkDecide: jest.fn() };
  const queue = { listTasks: jest.fn(), pendingCount: jest.fn() };
  const detail = { getDetail: jest.fn() };
  const svc = new ApprovalTaskService(engine as unknown as ApprovalWorkflowEngine, queue as unknown as ApprovalQueueService, detail as unknown as ApprovalDetailService);
  return { svc, engine, queue, detail };
}

describe('ApprovalTaskService (facade)', () => {
  it('delegates submitForApproval to the engine', async () => {
    const { svc, engine } = makeFacade();
    await svc.submitForApproval({ transactionType: 'PurchaseOrder', transactionId: 'po1', approverRoleCode: 'X' } as never, 'u1');
    expect(engine.submitForApproval).toHaveBeenCalledWith({ transactionType: 'PurchaseOrder', transactionId: 'po1', approverRoleCode: 'X' }, 'u1');
  });

  it('delegates decide to the engine', async () => {
    const { svc, engine } = makeFacade();
    await svc.decide({ taskId: 't1', decision: 'APPROVE' } as never, 'u1');
    expect(engine.decide).toHaveBeenCalledWith({ taskId: 't1', decision: 'APPROVE' }, 'u1');
  });

  it('delegates bulkDecide to the engine', async () => {
    const { svc, engine } = makeFacade();
    await svc.bulkDecide({ taskIds: ['t1'], decision: 'APPROVE' } as never, 'u1');
    expect(engine.bulkDecide).toHaveBeenCalledWith({ taskIds: ['t1'], decision: 'APPROVE' }, 'u1');
  });

  it('delegates listTasks to the queue', async () => {
    const { svc, queue } = makeFacade();
    const params = { page: 1, pageSize: 20 };
    await svc.listTasks('u1', params);
    expect(queue.listTasks).toHaveBeenCalledWith('u1', params);
  });

  it('delegates pendingCount to the queue', async () => {
    const { svc, queue } = makeFacade();
    await svc.pendingCount();
    expect(queue.pendingCount).toHaveBeenCalled();
  });

  it('delegates getDetail to the detail service', async () => {
    const { svc, detail } = makeFacade();
    await svc.getDetail('t1', 'u1');
    expect(detail.getDetail).toHaveBeenCalledWith('t1', 'u1');
  });
});
