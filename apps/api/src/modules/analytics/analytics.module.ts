import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { AnalyticsController } from './presentation/controllers/analytics.controller';
import { AnalyticsStreamController } from './presentation/controllers/analytics-stream.controller';
import { AnalyticsService } from './application/services/analytics.service';
import { ExecutiveAnalyticsService } from './application/services/executive-analytics.service';
import { FinancialAnalyticsService } from './application/services/financial-analytics.service';
import { ProjectAnalyticsService } from './application/services/project-analytics.service';
import { AnalyticsExportService } from './application/services/analytics-export.service';
import { ControlTowerService } from './application/services/control-tower.service';
import { TrendSeriesService } from './application/services/trend-series.service';
import { DecompositionService } from './application/services/decomposition.service';
import { MetricRegistry } from './application/services/shared/metric-registry.provider';

@Module({
  imports: [SharedModule],
  controllers: [AnalyticsController, AnalyticsStreamController],
  providers: [
    ExecutiveAnalyticsService,
    FinancialAnalyticsService,
    ProjectAnalyticsService,
    AnalyticsExportService,
    ControlTowerService,
    MetricRegistry,
    TrendSeriesService,
    DecompositionService,
    AnalyticsService,
  ],
})
export class AnalyticsModule {}
