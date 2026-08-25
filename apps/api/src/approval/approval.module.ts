import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ApprovalController } from './approval.controller';
import { ApprovalTaskService } from './services/approval-task.service';
import { WorkflowDefinitionService } from './services/workflow-definition.service';
import { ConditionEvaluator } from './services/shared/condition-evaluator';

@Module({
  imports: [],
  controllers: [ApprovalController],
  providers: [PrismaService, ConditionEvaluator, ApprovalTaskService, WorkflowDefinitionService],
})
export class ApprovalModule {}