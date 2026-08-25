import { Module } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AuditModule } from '@/audit/audit.module';
import { ProcurementController } from './procurement.controller';
import { PurchaseRequisitionService } from './services/purchase-requisition.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { RfqService } from './services/rfq.service';

@Module({
  imports: [AuditModule],
  controllers: [ProcurementController],
  providers: [PrismaService, PurchaseRequisitionService, PurchaseOrderService, RfqService],
})
export class ProcurementModule {}