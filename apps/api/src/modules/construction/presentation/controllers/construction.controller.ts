import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
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
  @Permissions('WorkPackage.VIEW')
  findAll(@Param('projectId') projectId: string, @Query() query: ListWorkPackageQueryDto) {
    return this.service.findAll(projectId, query);
  }

  @Post('work-packages')
  @Permissions('WorkPackage.CREATE')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWorkPackageDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.create(projectId, dto, request.user?.sub ?? 'system');
  }

  @Post('work-packages/:id/start')
  @Permissions('WorkPackage.EDIT')
  start(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.start(id, request.user?.sub ?? 'system');
  }

  @Get('work-packages/:id/readiness')
  @Permissions('WorkPackage.VIEW')
  readiness(@Param('id') id: string) {
    return this.service.readiness(id);
  }

  @Post('work-packages/:id/complete')
  @Permissions('WorkPackage.EDIT')
  complete(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.complete(id, request.user?.sub ?? 'system');
  }

  @Post('work-packages/:id/progress')
  @Permissions('WorkPackage.EDIT')
  addProgress(
    @Param('id') id: string,
    @Body() dto: CreateProgressDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.service.addProgress(id, dto, request.user?.sub ?? 'system');
  }

  @Get('daily-reports')
  @Permissions('DailyReport.VIEW')
  listDailyReports(@Param('projectId') projectId: string, @Query() query: ListDailyReportQueryDto) {
    return this.dailyReport.findAll(projectId, query);
  }

  @Post('daily-reports')
  @Permissions('DailyReport.CREATE')
  createDailyReport(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDailyReportDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.dailyReport.create(projectId, dto, request.user?.sub ?? 'system');
  }

  @Get('commissioning')
  @Permissions('Commissioning.VIEW')
  commissioningTree(@Param('projectId') projectId: string) {
    return this.commissioning.getTree(projectId);
  }

  @Post('commissioning')
  @Permissions('Commissioning.CREATE')
  createCommissioning(
    @Param('projectId') projectId: string,
    @Body() dto: CreateCommissioningDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.commissioning.create(projectId, dto, request.user?.sub ?? 'system');
  }

  @Post('commissioning/:id/status')
  @Permissions('Commissioning.EDIT')
  updateCommissioningStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCommissioningStatusDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.commissioning.updateStatus(id, dto.status, request.user?.sub ?? 'system');
  }

  @Get('handovers')
  @Permissions('Handover.VIEW')
  listHandovers(@Param('projectId') projectId: string, @Query() query: ListHandoverQueryDto) {
    return this.handover.findAll(projectId, query);
  }

  @Post('handovers')
  @Permissions('Handover.CREATE')
  createHandover(
    @Param('projectId') projectId: string,
    @Body() dto: CreateHandoverDto,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.handover.create(projectId, dto, request.user?.sub ?? 'system');
  }

  @Post('handovers/:id/submit')
  @Permissions('Handover.EDIT')
  submitHandover(@Param('id') id: string) {
    return this.handover.submit(id);
  }

  @Post('handovers/:id/items/:itemId/verify')
  @Permissions('Handover.EDIT')
  verifyHandoverItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Req() request: { user?: { sub?: string } },
  ) {
    return this.handover.verifyItem(id, itemId, request.user?.sub ?? 'system');
  }

  @Post('handovers/:id/approve')
  @Permissions('Handover.APPROVE')
  approveHandover(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.handover.approve(id, request.user?.sub ?? 'system');
  }
}
