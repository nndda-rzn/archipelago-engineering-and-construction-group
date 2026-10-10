import { Controller, Get, Inject, Query, Res, StreamableFile, UseGuards, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import type { AnalyticsFilterParams } from '@aec/api-contracts';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { contentDisposition } from '@/shared/export/csv';
import { AnalyticsService } from '../../application/services/analytics.service';
import { isDimensionKey, isMetricKey } from '../../application/services/shared/metric-registry';

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
  cashFlow(@Query() query: AnalyticsFilterParams, @Query('compare') compare?: string) {
    return this.analytics.cashFlow(query, compare === 'previous' ? 'previous' : undefined);
  }

  @Get('aging')
  @Permissions(Permission.AnalyticsView)
  aging(@Query() query: AnalyticsFilterParams, @Query('compare') compare?: string) {
    return this.analytics.aging(query, compare === 'previous' ? 'previous' : undefined);
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

  @Get('trend-series')
  @Permissions(Permission.AnalyticsView)
  trendSeries(
    @Query() query: AnalyticsFilterParams,
    @Query('metric') metric?: string,
    @Query('bucket') bucket?: string,
    @Query('compare') compare?: string,
  ) {
    if (!isMetricKey(metric)) {
      throw new BadRequestException({ code: 'UNSUPPORTED_METRIC', message: `Unknown metric: ${metric ?? '(none)'}` });
    }
    return this.analytics.trendSeries({
      ...query,
      metric,
      bucket: bucket === 'quarter' ? 'quarter' : 'month',
      compare: compare === 'previous' ? 'previous' : undefined,
    });
  }

  @Get('decomposition')
  @Permissions(Permission.AnalyticsView)
  decomposition(
    @Query() query: AnalyticsFilterParams,
    @Query('metric') metric?: string,
    @Query('dimension') dimension?: string,
    @Query('limit') limit?: string,
    @Query('compare') compare?: string,
  ) {
    if (!isMetricKey(metric)) {
      throw new BadRequestException({ code: 'UNSUPPORTED_METRIC', message: `Unknown metric: ${metric ?? '(none)'}` });
    }
    if (!isDimensionKey(dimension)) {
      throw new BadRequestException({ code: 'UNSUPPORTED_DECOMPOSITION', message: `Unknown dimension: ${dimension ?? '(none)'}` });
    }
    const parsedLimit = Number(limit);
    return this.analytics.decomposition({
      ...query,
      metric,
      dimension,
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined,
      compare: compare === 'previous' ? 'previous' : undefined,
    });
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
