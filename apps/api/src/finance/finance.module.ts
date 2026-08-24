import { Module } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AuditModule } from '@/audit/audit.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [AuditModule],
  controllers: [FinanceController],
  providers: [FinanceService, PrismaService],
})
export class FinanceModule {}
