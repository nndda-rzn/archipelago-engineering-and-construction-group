import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { SharedModule } from '@/shared/shared.module';
import { InventoryController } from './presentation/controllers/inventory.controller';
import { WarehouseService } from './application/services/warehouse.service';
import { GoodsReceiptService } from './application/services/goods-receipt.service';
import { MaterialIssueService } from './application/services/material-issue.service';
import { StockTransferService } from './application/services/stock-transfer.service';
import { StockAdjustmentService } from './application/services/stock-adjustment.service';
import { StockOpnameService } from './application/services/stock-opname.service';
import { StockLedgerService } from './application/services/stock-ledger.service';

@Module({
  imports: [SharedModule],
  controllers: [InventoryController],
  providers: [
    PrismaService,
    WarehouseService,
    GoodsReceiptService,
    MaterialIssueService,
    StockTransferService,
    StockAdjustmentService,
    StockOpnameService,
    StockLedgerService,
  ],
})
export class InventoryModule {}