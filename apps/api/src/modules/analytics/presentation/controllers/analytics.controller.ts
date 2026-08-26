import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { AnalyticsService } from '../../application/services/analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService) private readonly analytics: AnalyticsService,
  ) {}

  @Get('executive')
  @Permissions('Analytics.VIEW')
  executive() {
    return this.analytics.executive();
  }

  @Get('anomalies')
  @Permissions('Analytics.VIEW')
  anomalies() {
    return this.analytics.anomalies();
  }

  @Get('cash-flow')
  @Permissions('Analytics.VIEW')
  cashFlow() {
    return this.analytics.cashFlow();
  }

  @Get('aging')
  @Permissions('Analytics.VIEW')
  aging() {
    return this.analytics.aging();
  }

  @Get('project-cost-summary')
  @Permissions('Analytics.VIEW')
  projectCostSummary() {
    return this.analytics.projectCostSummary();
  }
}
