import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { SharedModule } from '@/shared/shared.module';
import { GovernanceController } from './presentation/controllers/governance.controller';
import { RiskService } from './application/services/risk.service';
import { AuditEngagementService } from './application/services/audit-engagement.service';
import { LegalCaseService } from './application/services/legal-case.service';
import { AccessReviewService } from './application/services/access-review.service';

@Module({
  imports: [SharedModule],
  controllers: [GovernanceController],
  providers: [
    PrismaService,
    RiskService,
    AuditEngagementService,
    LegalCaseService,
    AccessReviewService,
  ],
})
export class GovernanceModule {}
