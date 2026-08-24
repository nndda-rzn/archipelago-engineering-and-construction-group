import { Module } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AuditModule } from '@/audit/audit.module';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';

@Module({
  imports: [AuditModule],
  controllers: [ProcurementController],
  providers: [ProcurementService, PrismaService],
})
export class ProcurementModule {}
