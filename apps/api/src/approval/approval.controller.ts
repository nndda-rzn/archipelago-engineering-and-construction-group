import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { AddWorkflowStepDto, ApproveTaskDto, CreateWorkflowDefinitionDto, PublishWorkflowDto, SubmitForApprovalDto } from './dto/approval.dto';
import { ApprovalTaskService } from './services/approval-task.service';
import { WorkflowDefinitionService } from './services/workflow-definition.service';

@Controller('approvals')
@UseGuards(AuthGuard, PermissionsGuard)
export class ApprovalController {
  constructor(
    @Inject(ApprovalTaskService) private readonly task: ApprovalTaskService,
    @Inject(WorkflowDefinitionService) private readonly workflow: WorkflowDefinitionService,
  ) {}

  @Get()
  @Permissions('Approval.VIEW')
  listTasks(@Req() request: { user?: { sub?: string } }) {
    return this.task.listTasks(request.user?.sub ?? 'system');
  }

  @Post('submit')
  @Permissions('Approval.SUBMIT')
  submit(@Body() dto: SubmitForApprovalDto, @Req() request: { user?: { sub?: string } }) {
    return this.task.submitForApproval(dto, request.user?.sub ?? 'system');
  }

  @Post('decide')
  @Permissions('Approval.APPROVE')
  decide(@Body() dto: ApproveTaskDto, @Req() request: { user?: { sub?: string } }) {
    return this.task.decide(dto, request.user?.sub ?? 'system');
  }

  @Get('workflows')
  @Permissions('Workflow.VIEW')
  listDefinitions() {
    return this.workflow.listDefinitions();
  }

  @Post('workflows')
  @Permissions('Workflow.CREATE')
  createDefinition(@Body() dto: CreateWorkflowDefinitionDto, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.createDefinition(dto, request.user?.sub ?? 'system');
  }

  @Post('workflows/:id/steps')
  @Permissions('Workflow.EDIT')
  addStep(@Param('id') id: string, @Body() dto: AddWorkflowStepDto, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.addStep(id, dto, request.user?.sub ?? 'system');
  }

  @Post('workflows/:id/publish')
  @Permissions('Workflow.EDIT')
  publish(@Param('id') id: string, @Body() dto: PublishWorkflowDto, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.publishWorkflow(id, dto, request.user?.sub ?? 'system');
  }

  @Post('workflows/:code/version')
  @Permissions('Workflow.EDIT')
  newVersion(@Param('code') code: string, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.createNewVersion(code, request.user?.sub ?? 'system');
  }
}