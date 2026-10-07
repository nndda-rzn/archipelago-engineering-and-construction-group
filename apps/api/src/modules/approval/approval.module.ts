import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { ApprovalController } from './presentation/controllers/approval.controller';
import { ApprovalTaskService } from './application/services/approval-task.service';
import { WorkflowDefinitionService } from './application/services/workflow-definition.service';
import { WorkflowInsightsService } from './application/services/workflow-insights.service';
import { ConditionEvaluator } from './application/services/shared/condition-evaluator';
import { RoleAssignmentLookup } from './application/services/shared/role-assignment.lookup';
import { WorkflowQueryService } from './application/services/shared/workflow-query.service';
import { ApprovalDetailService } from './application/services/approval-detail.service';
import { ApprovalQueueService } from './application/services/approval-queue.service';
import { ApprovalWorkflowEngine } from './application/services/approval-workflow-engine.service';
import { WorkflowStepService } from './application/services/workflow-step.service';
import { WorkflowLifecycleService } from './application/services/workflow-lifecycle.service';

@Module({
  imports: [SharedModule],
  controllers: [ApprovalController],
  providers: [ConditionEvaluator, RoleAssignmentLookup, WorkflowQueryService, ApprovalDetailService, ApprovalQueueService, ApprovalWorkflowEngine, WorkflowStepService, WorkflowLifecycleService, ApprovalTaskService, WorkflowDefinitionService, WorkflowInsightsService],
})
export class ApprovalModule {}
