import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { CreateDailyReportDto, CreateProgressDto, CreateWorkPackageDto, ListDailyReportQueryDto, ListWorkPackageQueryDto } from '../dto/construction.dto';
import { WorkPackageService } from '../../application/services/work-package.service';
import { DailyReportService } from '../../application/services/daily-report.service';

@Controller('projects/:projectId')
@UseGuards(AuthGuard, PermissionsGuard)
export class ConstructionController {
  constructor(
    @Inject(WorkPackageService) private readonly service: WorkPackageService,
    @Inject(DailyReportService) private readonly dailyReport: DailyReportService,
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
}
