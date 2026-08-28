import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { CreateDailyReportDto, CreateProgressDto, CreateWorkPackageDto, ListDailyReportQueryDto, ListWorkPackageQueryDto } from '../dto/construction.dto';
import { CreateCommissioningDto, CreateHandoverDto, ListHandoverQueryDto, UpdateCommissioningStatusDto } from '../dto/commissioning.dto';
import { WorkPackageService } from '../../application/services/work-package.service';
import { DailyReportService } from '../../application/services/daily-report.service';
import { CommissioningService } from '../../application/services/commissioning.service';
import { HandoverService } from '../../application/services/handover.service';

@Controller('projects/:projectId')
@UseGuards(AuthGuard, PermissionsGuard)
export class ConstructionController {
  constructor(
    @Inject(WorkPackageService) private readonly service: WorkPackageService,
    @Inject(DailyReportService) private readonly dailyReport: DailyReportService,
    @Inject(CommissioningService) private readonly commissioning: CommissioningService,
    @Inject(HandoverService) private readonly handover: HandoverService,
  ) {}

  @Get('work-packages')
  @Permissions(Permission.WorkPackageView)
  findAll(@Param('projectId') projectId: string, @Query() query: ListWorkPackageQueryDto) {
    return this.service.findAll(projectId, query);
  }

  @Post('work-packages')
  @Permissions(Permission.WorkPackageCreate)
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWorkPackageDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.create(projectId, dto, request.user?.sub ?? 'system');
  }

  @Post('work-packages/:id/start')
  @Permissions(Permission.WorkPackageEdit)
  start(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.start(id, request.user?.sub ?? 'system');
  }

  @Get('work-packages/:id/readiness')
  @Permissions(Permission.WorkPackageView)
  readiness(@Param('id') id: string) {
    return this.service.readiness(id);
  }

  @Post('work-packages/:id/complete')
  @Permissions(Permission.WorkPackageEdit)
  complete(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.complete(id, request.user?.sub ?? 'system');
  }

  @Post('work-packages/:id/progress')
  @Permissions(Permission.WorkPackageEdit)
  addProgress(
    @Param('id') id: string,
    @Body() dto: CreateProgressDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.addProgress(id, dto, request.user?.sub ?? 'system');
  }

  @Get('daily-reports')
  @Permissions(Permission.DailyReportView)
  listDailyReports(@Param('projectId') projectId: string, @Query() query: ListDailyReportQueryDto) {
    return this.dailyReport.findAll(projectId, query);
  }

  @Post('daily-reports')
  @Permissions(Permission.DailyReportCreate)
  createDailyReport(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDailyReportDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.dailyReport.create(projectId, dto, request.user?.sub ?? 'system');
  }

  @Get('commissioning')
  @Permissions(Permission.CommissioningView)
  commissioningTree(@Param('projectId') projectId: string) {
    return this.commissioning.getTree(projectId);
  }

  @Post('commissioning')
  @Permissions(Permission.CommissioningCreate)
  createCommissioning(
    @Param('projectId') projectId: string,
    @Body() dto: CreateCommissioningDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.commissioning.create(projectId, dto, request.user?.sub ?? 'system');
  }

  @Post('commissioning/:id/status')
  @Permissions(Permission.CommissioningEdit)
  updateCommissioningStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCommissioningStatusDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.commissioning.updateStatus(id, dto.status, request.user?.sub ?? 'system');
  }

  @Get('handovers')
  @Permissions(Permission.HandoverView)
  listHandovers(@Param('projectId') projectId: string, @Query() query: ListHandoverQueryDto) {
    return this.handover.findAll(projectId, query);
  }

  @Post('handovers')
  @Permissions(Permission.HandoverCreate)
  createHandover(
    @Param('projectId') projectId: string,
    @Body() dto: CreateHandoverDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.handover.create(projectId, dto, request.user?.sub ?? 'system');
  }

  @Post('handovers/:id/submit')
  @Permissions(Permission.HandoverEdit)
  submitHandover(@Param('id') id: string) {
    return this.handover.submit(id);
  }

  @Post('handovers/:id/items/:itemId/verify')
  @Permissions(Permission.HandoverEdit)
  verifyHandoverItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.handover.verifyItem(id, itemId, request.user?.sub ?? 'system');
  }

  @Post('handovers/:id/approve')
  @Permissions(Permission.HandoverApprove)
  approveHandover(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.handover.approve(id, request.user?.sub ?? 'system');
  }
}
