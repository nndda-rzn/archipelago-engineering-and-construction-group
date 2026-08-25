import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ConstructionController } from './presentation/controllers/construction.controller';
import { WorkPackageService } from './application/services/work-package.service';
import { DailyReportService } from './application/services/daily-report.service';
import { CommissioningService } from './application/services/commissioning.service';
import { HandoverService } from './application/services/handover.service';

@Module({
  imports: [],
  controllers: [ConstructionController],
  providers: [PrismaService, WorkPackageService, DailyReportService, CommissioningService, HandoverService],
})
export class ConstructionModule {}
