import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { SharedModule } from '@/shared/shared.module';
import { CommercialController } from './presentation/controllers/commercial.controller';
import { TenderController } from './presentation/controllers/tender.controller';
import { CommercialService } from './application/services/commercial.service';
import { BidDecisionService } from './application/services/bid-decision.service';
import { EstimateService } from './application/services/estimate.service';
import { ContractDeviationService } from './application/services/contract-deviation.service';
import { TenderSubmissionService } from './application/services/tender-submission.service';
import { ContractAmendmentService } from './application/services/contract-amendment.service';

@Module({
  imports: [SharedModule],
  controllers: [CommercialController, TenderController],
  providers: [
    PrismaService,
    CommercialService,
    BidDecisionService,
    EstimateService,
    ContractDeviationService,
    TenderSubmissionService,
    ContractAmendmentService,
  ],
})
export class CommercialModule {}
