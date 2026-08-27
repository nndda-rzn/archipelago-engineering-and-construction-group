import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ProcurementController } from './presentation/controllers/procurement.controller';
import { ProcurementHardeningController } from './presentation/controllers/procurement-hardening.controller';
import { PurchaseRequisitionService } from './application/services/purchase-requisition.service';
import { PurchaseOrderService } from './application/services/purchase-order.service';
import { RfqService } from './application/services/rfq.service';
import { ProcurementHardeningService } from './application/services/procurement-hardening.service';

@Module({
  imports: [],
  controllers: [ProcurementController, ProcurementHardeningController],
  providers: [PrismaService, PurchaseRequisitionService, PurchaseOrderService, RfqService, ProcurementHardeningService],
})
export class ProcurementModule {}