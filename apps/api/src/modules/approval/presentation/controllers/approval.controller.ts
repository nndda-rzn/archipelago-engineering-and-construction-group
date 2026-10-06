import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { AddWorkflowStepDto, ApproveTaskDto, BulkDecideDto, CreateWorkflowDefinitionDto, ListApprovalQueryDto, PublishWorkflowDto, ReorderWorkflowStepsDto, SubmitForApprovalDto, UpdateWorkflowDefinitionDto, UpdateWorkflowStepDto } from '../dto/approval.dto';
import { ApprovalTaskService } from '../../application/services/approval-task.service';
import { WorkflowDefinitionService } from '../../application/services/workflow-definition.service';
import { WorkflowInsightsService } from '../../application/services/workflow-insights.service';

@Controller('approvals')
@UseGuards(AuthGuard, PermissionsGuard)
export class ApprovalController {
  constructor(
    @Inject(ApprovalTaskService) private readonly task: ApprovalTaskService,
    @Inject(WorkflowDefinitionService) private readonly workflow: WorkflowDefinitionService,
    @Inject(WorkflowInsightsService) private readonly insights: WorkflowInsightsService,
  ) {}

  @Get()
  @Permissions(Permission.ApprovalView)
  listTasks(@Req() request: { user?: { sub?: string } }, @Query() query: ListApprovalQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 20));
    return this.task.listTasks(request.user?.sub ?? 'system', {
      status: query.status,
      type: query.type,
      q: query.q,
      mine: query.mine === 'true' || query.mine === '1',
      page,
      pageSize,
    });
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

  @Post('bulk-decide')
  @Permissions(Permission.ApprovalApprove)
  bulkDecide(@Body() dto: BulkDecideDto, @Req() request: { user?: { sub?: string } }) {
    return this.task.bulkDecide(dto, request.user?.sub ?? 'system');
  }

  @Get('pending-count')
  @Permissions(Permission.ApprovalView)
  async pendingCount() {
    return { count: await this.task.pendingCount() };
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

  // Rute statis harus lebih dulu dari `:id`, kalau tidak `:id` akan menelannya.
  @Get('workflows/:code/versions')
  @Permissions(Permission.WorkflowView)
  listVersions(@Param('code') code: string) {
    return this.workflow.listVersions(code);
  }

  @Get('workflows/:code/versions/diff')
  @Permissions(Permission.WorkflowView)
  diffVersions(
    @Param('code') code: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.workflow.diffVersions(code, Number(from), Number(to));
  }

  @Get('workflows/:id/insights')
  @Permissions(Permission.WorkflowView)
  workflowInsights(@Param('id') id: string) {
    return this.insights.forDefinition(id);
  }

  @Patch('workflows/:id')
  @Permissions(Permission.WorkflowEdit)
  updateDefinition(@Param('id') id: string, @Body() dto: UpdateWorkflowDefinitionDto, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.updateDefinition(id, dto, request.user?.sub ?? 'system');
  }

  @Delete('workflows/:id')
  @Permissions(Permission.WorkflowDelete)
  deleteDefinition(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.deleteWorkflow(id, request.user?.sub ?? 'system');
  }

  @Post('workflows/:id/steps')
  @Permissions(Permission.WorkflowEdit)
  addStep(@Param('id') id: string, @Body() dto: AddWorkflowStepDto, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.addStep(id, dto, request.user?.sub ?? 'system');
  }

  @Post('workflows/:id/steps/reorder')
  @Permissions(Permission.WorkflowEdit)
  reorderSteps(@Param('id') id: string, @Body() dto: ReorderWorkflowStepsDto, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.reorderSteps(id, dto, request.user?.sub ?? 'system');
  }

  @Patch('workflows/:id/steps/:stepId')
  @Permissions(Permission.WorkflowEdit)
  updateStep(@Param('id') id: string, @Param('stepId') stepId: string, @Body() dto: UpdateWorkflowStepDto, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.updateStep(id, stepId, dto, request.user?.sub ?? 'system');
  }

  @Delete('workflows/:id/steps/:stepId')
  @Permissions(Permission.WorkflowEdit)
  removeStep(@Param('id') id: string, @Param('stepId') stepId: string, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.removeStep(id, stepId, request.user?.sub ?? 'system');
  }

  @Post('workflows/:id/publish')
  @Permissions(Permission.WorkflowEdit)
  publish(@Param('id') id: string, @Body() dto: PublishWorkflowDto, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.publishWorkflow(id, dto, request.user?.sub ?? 'system');
  }

  @Post('workflows/:id/archive')
  @Permissions(Permission.WorkflowEdit)
  archive(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.archiveWorkflow(id, request.user?.sub ?? 'system');
  }

  @Post('workflows/:code/version')
  @Permissions(Permission.WorkflowEdit)
  newVersion(@Param('code') code: string, @Req() request: { user?: { sub?: string } }) {
    return this.workflow.createNewVersion(code, request.user?.sub ?? 'system');
  }

  // Ditaruh paling akhir: route `:id` akan menelan path statis (mis. `workflows`,
  // `pending-count`) bila didaftarkan lebih dulu.
  @Get(':id')
  @Permissions(Permission.ApprovalView)
  getDetail(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.task.getDetail(id, request.user?.sub ?? 'system');
  }
}
