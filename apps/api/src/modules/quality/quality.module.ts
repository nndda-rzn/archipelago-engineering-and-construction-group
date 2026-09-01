import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { SharedModule } from '@/shared/shared.module';
import { QualityController } from './presentation/controllers/quality.controller';
import { ItpService } from './application/services/itp.service';
import { InspectionService } from './application/services/inspection.service';
import { NcrService } from './application/services/ncr.service';
import { PunchListService } from './application/services/punch-list.service';

@Module({
  imports: [SharedModule],
  controllers: [QualityController],
  providers: [PrismaService, ItpService, InspectionService, NcrService, PunchListService],
})
export class QualityModule {}
