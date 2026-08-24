import { Module } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AuditModule } from '@/audit/audit.module';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';

@Module({
  imports: [AuditModule],
  controllers: [ApprovalController],
  providers: [ApprovalService, PrismaService],
  exports: [ApprovalService],
})
export class ApprovalModule {}
