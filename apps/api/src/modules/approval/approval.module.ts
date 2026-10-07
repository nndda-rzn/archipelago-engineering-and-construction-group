import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { ApprovalController } from './presentation/controllers/approval.controller';
import { ApprovalTaskService } from './application/services/approval-task.service';
import { WorkflowDefinitionService } from './application/services/workflow-definition.service';
import { WorkflowInsightsService } from './application/services/workflow-insights.service';
import { ConditionEvaluator } from './application/services/shared/condition-evaluator';
import { RoleAssignmentLookup } from './application/services/shared/role-assignment.lookup';

@Module({
  imports: [SharedModule],
  controllers: [ApprovalController],
  providers: [ConditionEvaluator, RoleAssignmentLookup, ApprovalTaskService, WorkflowDefinitionService, WorkflowInsightsService],
})
export class ApprovalModule {}
