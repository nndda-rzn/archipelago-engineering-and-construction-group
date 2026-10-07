import { Controller, Get, Inject, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AnalyticsFilterParams } from '@aec/api-contracts';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { contentDisposition } from '@/shared/export/csv';
import { AnalyticsService } from '../../application/services/analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService) private readonly analytics: AnalyticsService,
  ) {}

  @Get('executive')
  @Permissions(Permission.AnalyticsView)
  executive(@Query() query: AnalyticsFilterParams, @Query('compare') compare?: string) {
    return this.analytics.executive(query, compare === 'previous' ? 'previous' : undefined);
  }

  @Get('anomalies')
  @Permissions(Permission.AnalyticsView)
  anomalies() {
    return this.analytics.anomalies();
  }

  @Get('signals')
  @Permissions(Permission.AnalyticsView)
  signals(@Query() query: AnalyticsFilterParams) {
    return this.analytics.signals(query);
  }

  @Get('cash-flow')
  @Permissions(Permission.AnalyticsView)
  cashFlow(@Query() query: AnalyticsFilterParams) {
    return this.analytics.cashFlow(query);
  }

  @Get('aging')
  @Permissions(Permission.AnalyticsView)
  aging(@Query() query: AnalyticsFilterParams) {
    return this.analytics.aging(query);
  }

  @Get('project-cost-summary')
  @Permissions(Permission.AnalyticsView)
  projectCostSummary(@Query() query: AnalyticsFilterParams) {
    return this.analytics.projectCostSummary(query);
  }

  @Get('ar-concentration')
  @Permissions(Permission.AnalyticsView)
  arConcentration(@Query() query: AnalyticsFilterParams) {
    return this.analytics.arConcentration(query);
  }

  @Get('forecast-vs-actual')
  @Permissions(Permission.AnalyticsView)
  forecastVsActual(@Query() query: AnalyticsFilterParams) {
    return this.analytics.forecastVsActual(query);
  }

  @Get('cost-composition')
  @Permissions(Permission.AnalyticsView)
  costComposition(@Query() query: AnalyticsFilterParams) {
    return this.analytics.costComposition(query);
  }

  @Get('control-tower')
  @Permissions(Permission.AnalyticsView)
  controlTower(@Query() query: AnalyticsFilterParams) {
    return this.analytics.controlTower(query);
  }

  @Get('aging/export.csv')
  @Permissions(Permission.AnalyticsView)
  async exportAging(@Query() query: AnalyticsFilterParams, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition('aging-ar-ap'));
    return new StreamableFile(await this.analytics.exportAgingCsv(query));
  }

  @Get('cash-flow/export.csv')
  @Permissions(Permission.AnalyticsView)
  async exportCashFlow(@Query() query: AnalyticsFilterParams, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition('cash-flow'));
    return new StreamableFile(await this.analytics.exportCashFlowCsv(query));
  }

  @Get('project-cost-summary/export.csv')
  @Permissions(Permission.AnalyticsView)
  async exportProjectCostSummary(@Query() query: AnalyticsFilterParams, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition('project-cost-summary'));
    return new StreamableFile(await this.analytics.exportProjectCostSummaryCsv(query));
  }
}
