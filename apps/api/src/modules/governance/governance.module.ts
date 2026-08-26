import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { GovernanceController } from './presentation/controllers/governance.controller';
import { GovernanceService } from './application/services/governance.service';

@Module({
  imports: [],
  controllers: [GovernanceController],
  providers: [GovernanceService, PrismaService],
})
export class GovernanceModule {}
