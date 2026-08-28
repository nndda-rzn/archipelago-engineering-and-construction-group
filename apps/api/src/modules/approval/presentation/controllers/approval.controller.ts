import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { AddWorkflowStepDto, ApproveTaskDto, CreateWorkflowDefinitionDto, PublishWorkflowDto, SubmitForApprovalDto } from '../dto/approval.dto';
import { ApprovalTaskService } from '../../application/services/approval-task.service';
import { WorkflowDefinitionService } from '../../application/services/workflow-definition.service';

@Controller('approvals')
@UseGuards(AuthGuard, PermissionsGuard)
export class ApprovalController {
  constructor(
    @Inject(ApprovalTaskService) private readonly task: ApprovalTaskService,
    @Inject(WorkflowDefinitionService) private readonly workflow: WorkflowDefinitionService,
  ) {}

  @Get()
  @Permissions(Permission.ApprovalView)
  listTasks(
    @Req() request: { user?: { sub?: string } },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(200, Math.max(1, Number(pageSize) || 20));
    return this.task.listTasks(request.user?.sub ?? 'system', p, ps);
  }

  @Post('submit')
  @Permissions(Permission.ApprovalSubmit)
  submit(@Body() dto: SubmitForApprovalDto, @Req() request: { user?: { sub?: string } }) {
    return this.task.submitForApproval(dto, request.user?.sub ?? 'system');
  }

  @Post('decide')
  @Permissions(Permission.ApprovalApprove)
  decide(@Body() dto: ApproveTaskDto, @Req() request: { user?: { sub?: string } }) {
    return this.task.decide(dto, request.user?.sub ?? 'system');
  }

  @Get('workflows')
  @Permissions(Permission.WorkflowView)
  listDefinitions() {
    return this.workflow.listDefinitions();
  }

  @Post('workflows')
  @Permissions(Permission.WorkflowCreate)
  createDefinition(@Body() dto: CreateWorkflowDefinitionDto, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.createDefinition(dto, request.user?.sub ?? 'system');
  }

  @Post('workflows/:id/steps')
  @Permissions(Permission.WorkflowEdit)
  addStep(@Param('id') id: string, @Body() dto: AddWorkflowStepDto, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.addStep(id, dto, request.user?.sub ?? 'system');
  }

  @Post('workflows/:id/publish')
  @Permissions(Permission.WorkflowEdit)
  publish(@Param('id') id: string, @Body() dto: PublishWorkflowDto, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.publishWorkflow(id, dto, request.user?.sub ?? 'system');
  }

  @Post('workflows/:code/version')
  @Permissions(Permission.WorkflowEdit)
  newVersion(@Param('code') code: string, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.createNewVersion(code, request.user?.sub ?? 'system');
  }
}