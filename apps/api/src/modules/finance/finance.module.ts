import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { SharedModule } from '@/shared/shared.module';
import { FinanceController } from './presentation/controllers/finance.controller';
import { FinanceClosureController } from './presentation/controllers/finance-closure.controller';
import { VendorInvoiceService } from './application/services/vendor-invoice.service';
import { PaymentService } from './application/services/payment.service';
import { ChartOfAccountService } from './application/services/chart-of-account.service';
import { JournalService } from './application/services/journal.service';
import { TrialBalanceService } from './application/services/trial-balance.service';
import { ProgressClaimService } from './application/services/progress-claim.service';
import { ClientInvoiceService } from './application/services/client-invoice.service';
import { CollectionService } from './application/services/collection.service';
import { VariationService } from './application/services/variation.service';
import { SubcontractService } from './application/services/subcontract.service';
import { FinanceClosureService } from './application/services/finance-closure.service';
import { GlHelper } from './application/services/shared/gl.helper';

@Module({
  imports: [SharedModule],
  controllers: [FinanceController, FinanceClosureController],
  providers: [
    PrismaService,
    GlHelper,
    VendorInvoiceService,
    PaymentService,
    ChartOfAccountService,
    JournalService,
    TrialBalanceService,
    ProgressClaimService,
    ClientInvoiceService,
    CollectionService,
    VariationService,
    SubcontractService,
    FinanceClosureService,
  ],
})
export class FinanceModule {}