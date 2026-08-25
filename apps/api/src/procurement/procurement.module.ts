import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ProcurementController } from './procurement.controller';
import { PurchaseRequisitionService } from './services/purchase-requisition.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { RfqService } from './services/rfq.service';

@Module({
  imports: [],
  controllers: [ProcurementController],
  providers: [PrismaService, PurchaseRequisitionService, PurchaseOrderService, RfqService],
})
export class ProcurementModule {}