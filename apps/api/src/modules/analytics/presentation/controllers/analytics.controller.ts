import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
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
}
