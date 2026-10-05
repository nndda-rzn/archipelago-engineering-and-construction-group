import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { HseController } from './presentation/controllers/hse.controller';
import { SafetyObservationService } from './application/services/safety-observation.service';
import { HseIncidentService } from './application/services/hse-incident.service';
import { PermitToWorkService } from './application/services/permit-to-work.service';
import { CorrectiveActionService } from './application/services/corrective-action.service';

@Module({
  imports: [SharedModule],
  controllers: [HseController],
  providers: [SafetyObservationService, HseIncidentService, PermitToWorkService, CorrectiveActionService],
})
export class HseModule {}
