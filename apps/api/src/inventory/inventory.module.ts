import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditModule } from '@/audit/audit.module';
import { InventoryController } from './inventory.controller';
import { WarehouseService } from './services/warehouse.service';
import { GoodsReceiptService } from './services/goods-receipt.service';
import { MaterialIssueService } from './services/material-issue.service';
import { StockTransferService } from './services/stock-transfer.service';
import { StockAdjustmentService } from './services/stock-adjustment.service';
import { StockOpnameService } from './services/stock-opname.service';
import { StockLedgerService } from './services/stock-ledger.service';

@Module({
  imports: [AuditModule],
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