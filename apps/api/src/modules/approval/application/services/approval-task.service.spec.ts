import { ApprovalTaskService } from './approval-task.service';

describe('ApprovalTaskService.pendingCount', () => {
  it('counts PENDING approval tasks', async () => {
    const count = jest.fn().mockResolvedValue(4);
    const prisma = { approvalTask: { count } } as never;

    const svc = new ApprovalTaskService(prisma, {} as never, {} as never);
    await expect(svc.pendingCount()).resolves.toBe(4);
    expect(count).toHaveBeenCalledWith({ where: { status: 'PENDING' } });
  });
});
