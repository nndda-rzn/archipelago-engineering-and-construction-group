import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ProcurementController } from './presentation/controllers/procurement.controller';
import { PurchaseRequisitionService } from './application/services/purchase-requisition.service';
import { PurchaseOrderService } from './application/services/purchase-order.service';
import { RfqService } from './application/services/rfq.service';

@Module({
  imports: [],
  controllers: [ProcurementController],
  providers: [PrismaService, PurchaseRequisitionService, PurchaseOrderService, RfqService],
})
export class ProcurementModule {}