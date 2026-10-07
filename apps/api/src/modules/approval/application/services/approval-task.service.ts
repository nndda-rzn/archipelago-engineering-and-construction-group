import { Inject, Injectable } from '@nestjs/common';
import type { ApprovalDetail, BulkDecideResponse } from '@aec/api-contracts';
import { ApprovalWorkflowEngine } from './approval-workflow-engine.service';
import { ApprovalQueueService, type ListTasksParams } from './approval-queue.service';
import { ApprovalDetailService } from './approval-detail.service';
import type { ApproveTaskDto, BulkDecideDto, SubmitForApprovalDto } from '../../presentation/dto/approval.dto';

export type { ListTasksParams } from './approval-queue.service';

/**
 * Permukaan publik approval untuk controller. Ini **facade** tipis: menulis
 * (submit/decide) didelegasikan ke `ApprovalWorkflowEngine`, membaca antrean ke
 * `ApprovalQueueService`, dan membaca detail ke `ApprovalDetailService`. Controller
 * tidak berubah — hanya komposisi di baliknya yang dipisah.
 */
@Injectable()
export class ApprovalTaskService {
  constructor(
    @Inject(ApprovalWorkflowEngine) private readonly engine: ApprovalWorkflowEngine,
    @Inject(ApprovalQueueService) private readonly queue: ApprovalQueueService,
    @Inject(ApprovalDetailService) private readonly detail: ApprovalDetailService,
  ) {}

  submitForApproval(dto: SubmitForApprovalDto, actorId: string) {
    return this.engine.submitForApproval(dto, actorId);
  }

  decide(dto: ApproveTaskDto, actorId: string) {
    return this.engine.decide(dto, actorId);
  }

  bulkDecide(dto: BulkDecideDto, actorId: string): Promise<BulkDecideResponse> {
    return this.engine.bulkDecide(dto, actorId);
  }

  listTasks(actorId: string, params: ListTasksParams) {
    return this.queue.listTasks(actorId, params);
  }

  pendingCount(): Promise<number> {
    return this.queue.pendingCount();
  }

  getDetail(taskId: string, actorId: string): Promise<ApprovalDetail> {
    return this.detail.getDetail(taskId, actorId);
  }
}
