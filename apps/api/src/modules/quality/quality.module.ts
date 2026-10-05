import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { QualityController } from './presentation/controllers/quality.controller';
import { ItpService } from './application/services/itp.service';
import { InspectionService } from './application/services/inspection.service';
import { NcrService } from './application/services/ncr.service';
import { PunchListService } from './application/services/punch-list.service';

@Module({
  imports: [SharedModule],
  controllers: [QualityController],
  providers: [ItpService, InspectionService, NcrService, PunchListService],
})
export class QualityModule {}
