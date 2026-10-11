import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { AddStakeholderDto, AdvancePhaseDto, CreateMilestoneDto, UpdateMilestoneDto } from '../dto/project.dto';
import { ProjectCommandCenterService } from '../../application/services/project-command-center.service';

type ReqUser = { user?: { sub?: string } };

/**
 * Command center proyek — ringkasan lintas domain, jadwal (S-curve), aliran kas,
 * milestone, fase/gate, dan stakeholder. Rute statis didaftarkan sebelum `:id`.
 */
@Controller('projects/:projectId')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProjectCommandCenterController {
  constructor(@Inject(ProjectCommandCenterService) private readonly service: ProjectCommandCenterService) {}

  @Get('summary')
  @Permissions(Permission.ProjectView)
  summary(@Param('projectId') projectId: string) {
    return this.service.summary(projectId);
  }

  @Get('schedule')
  @Permissions(Permission.ProjectView)
  schedule(@Param('projectId') projectId: string) {
    return this.service.schedule(projectId);
  }

  @Get('cash-flow')
  @Permissions(Permission.ProjectView)
  cashFlow(@Param('projectId') projectId: string) {
    return this.service.cashFlow(projectId);
  }

  @Get('domains')
  @Permissions(Permission.ProjectView)
  domains(@Param('projectId') projectId: string) {
    return this.service.domains(projectId);
  }

  @Get('gantt')
  @Permissions(Permission.ProjectView)
  gantt(@Param('projectId') projectId: string) {
    return this.service.gantt(projectId);
  }

  @Get('phases')
  @Permissions(Permission.ProjectView)
  phases(@Param('projectId') projectId: string) {
    return this.service.phases(projectId);
  }

  @Post('phases/advance')
  @Permissions(Permission.ProjectManageSchedule)
  advancePhase(@Param('projectId') projectId: string, @Body() dto: AdvancePhaseDto, @Req() request: ReqUser) {
    return this.service.advancePhase(projectId, dto, request.user?.sub ?? 'system');
  }

  @Get('milestones')
  @Permissions(Permission.ProjectView)
  milestones(@Param('projectId') projectId: string) {
    return this.service.milestones(projectId);
  }

  @Post('milestones')
  @Permissions(Permission.ProjectManageSchedule)
  createMilestone(@Param('projectId') projectId: string, @Body() dto: CreateMilestoneDto, @Req() request: ReqUser) {
    return this.service.createMilestone(projectId, dto, request.user?.sub ?? 'system');
  }

  @Patch('milestones/:milestoneId')
  @Permissions(Permission.ProjectManageSchedule)
  updateMilestone(@Param('projectId') projectId: string, @Param('milestoneId') milestoneId: string, @Body() dto: UpdateMilestoneDto, @Req() request: ReqUser) {
    return this.service.updateMilestone(projectId, milestoneId, dto, request.user?.sub ?? 'system');
  }

  @Delete('milestones/:milestoneId')
  @Permissions(Permission.ProjectManageSchedule)
  deleteMilestone(@Param('projectId') projectId: string, @Param('milestoneId') milestoneId: string, @Req() request: ReqUser) {
    return this.service.deleteMilestone(projectId, milestoneId, request.user?.sub ?? 'system');
  }

  @Get('stakeholders')
  @Permissions(Permission.ProjectView)
  stakeholders(@Param('projectId') projectId: string) {
    return this.service.stakeholders(projectId);
  }

  @Post('stakeholders')
  @Permissions(Permission.ProjectEdit)
  addStakeholder(@Param('projectId') projectId: string, @Body() dto: AddStakeholderDto, @Req() request: ReqUser) {
    return this.service.addStakeholder(projectId, dto, request.user?.sub ?? 'system');
  }

  @Delete('stakeholders/:stakeholderId')
  @Permissions(Permission.ProjectEdit)
  removeStakeholder(@Param('projectId') projectId: string, @Param('stakeholderId') stakeholderId: string, @Req() request: ReqUser) {
    return this.service.removeStakeholder(projectId, stakeholderId, request.user?.sub ?? 'system');
  }
}
