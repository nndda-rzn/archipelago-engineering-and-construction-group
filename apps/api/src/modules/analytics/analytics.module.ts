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

@Module({
  imports: [SharedModule],
  controllers: [AnalyticsController, AnalyticsStreamController],
  providers: [
    ExecutiveAnalyticsService,
    FinancialAnalyticsService,
    ProjectAnalyticsService,
    AnalyticsExportService,
    ControlTowerService,
    AnalyticsService,
  ],
})
export class AnalyticsModule {}
