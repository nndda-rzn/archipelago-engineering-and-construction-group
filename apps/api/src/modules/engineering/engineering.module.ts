import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { EngineeringController } from './presentation/controllers/engineering.controller';
import { DeliverableService } from './application/services/deliverable.service';
import { DrawingService } from './application/services/drawing.service';
import { RfiService } from './application/services/rfi.service';
import { SubmittalService } from './application/services/submittal.service';
import { TransmittalService } from './application/services/transmittal.service';

@Module({
  imports: [SharedModule],
  controllers: [EngineeringController],
  providers: [
    DeliverableService,
    DrawingService,
    RfiService,
    SubmittalService,
    TransmittalService,
  ],
})
export class EngineeringModule {}
