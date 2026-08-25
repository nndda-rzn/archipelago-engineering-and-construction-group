import { Module } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AuditModule } from '@/audit/audit.module';
import { FinanceController } from './finance.controller';
import { VendorInvoiceService } from './services/vendor-invoice.service';
import { PaymentService } from './services/payment.service';
import { ChartOfAccountService } from './services/chart-of-account.service';
import { JournalService } from './services/journal.service';
import { TrialBalanceService } from './services/trial-balance.service';
import { ProgressClaimService } from './services/progress-claim.service';
import { ClientInvoiceService } from './services/client-invoice.service';
import { CollectionService } from './services/collection.service';
import { GlHelper } from './services/shared/gl.helper';

@Module({
  imports: [AuditModule],
  controllers: [FinanceController],
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
  ],
})
export class FinanceModule {}