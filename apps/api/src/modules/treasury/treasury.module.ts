import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { TreasuryController } from './presentation/controllers/treasury.controller';
import { BankAccountService } from './application/services/bank-account.service';
import { PaymentProposalService } from './application/services/payment-proposal.service';
import { BankGuaranteeService } from './application/services/bank-guarantee.service';
import { CashForecastService } from './application/services/cash-forecast.service';
import { FxExposureService } from './application/services/fx-exposure.service';

@Module({
  imports: [SharedModule],
  controllers: [TreasuryController],
  providers: [
    BankAccountService,
    PaymentProposalService,
    BankGuaranteeService,
    CashForecastService,
    FxExposureService,
  ],
})
export class TreasuryModule {}
