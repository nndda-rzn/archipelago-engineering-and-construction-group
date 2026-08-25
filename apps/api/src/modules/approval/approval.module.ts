import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ApprovalController } from './presentation/controllers/approval.controller';
import { ApprovalTaskService } from './application/services/approval-task.service';
import { WorkflowDefinitionService } from './application/services/workflow-definition.service';
import { ConditionEvaluator } from './application/services/shared/condition-evaluator';

@Module({
  imports: [],
  controllers: [ApprovalController],
  providers: [PrismaService, ConditionEvaluator, ApprovalTaskService, WorkflowDefinitionService],
})
export class ApprovalModule {}