import { Controller, Get, Inject, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
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
  executive() {
    return this.analytics.executive();
  }

  @Get('anomalies')
  @Permissions(Permission.AnalyticsView)
  anomalies() {
    return this.analytics.anomalies();
  }

  @Get('cash-flow')
  @Permissions(Permission.AnalyticsView)
  cashFlow() {
    return this.analytics.cashFlow();
  }

  @Get('aging')
  @Permissions(Permission.AnalyticsView)
  aging() {
    return this.analytics.aging();
  }

  @Get('project-cost-summary')
  @Permissions(Permission.AnalyticsView)
  projectCostSummary() {
    return this.analytics.projectCostSummary();
  }

  @Get('aging/export.csv')
  @Permissions(Permission.AnalyticsView)
  async exportAging(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition('aging-ar-ap'));
    return new StreamableFile(await this.analytics.exportAgingCsv());
  }

  @Get('cash-flow/export.csv')
  @Permissions(Permission.AnalyticsView)
  async exportCashFlow(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition('cash-flow'));
    return new StreamableFile(await this.analytics.exportCashFlowCsv());
  }

  @Get('project-cost-summary/export.csv')
  @Permissions(Permission.AnalyticsView)
  async exportProjectCostSummary(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition('project-cost-summary'));
    return new StreamableFile(await this.analytics.exportProjectCostSummaryCsv());
  }
}
