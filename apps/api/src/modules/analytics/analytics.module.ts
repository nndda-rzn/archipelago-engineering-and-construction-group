import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AnalyticsController } from './presentation/controllers/analytics.controller';
import { AnalyticsService } from './application/services/analytics.service';

@Module({
  imports: [],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PrismaService],
})
export class AnalyticsModule {}
