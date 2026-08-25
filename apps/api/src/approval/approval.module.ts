import { Module } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AuditModule } from '@/audit/audit.module';
import { ApprovalController } from './approval.controller';
import { ApprovalTaskService } from './services/approval-task.service';
import { WorkflowDefinitionService } from './services/workflow-definition.service';
import { ConditionEvaluator } from './services/shared/condition-evaluator';

@Module({
  imports: [AuditModule],
  controllers: [ApprovalController],
  providers: [PrismaService, ConditionEvaluator, ApprovalTaskService, WorkflowDefinitionService],
})
export class ApprovalModule {}