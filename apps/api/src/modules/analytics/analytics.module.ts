import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { AnalyticsController } from './presentation/controllers/analytics.controller';
import { AnalyticsService } from './application/services/analytics.service';

@Module({
  imports: [SharedModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
