import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import {
  CreateGoodsReceiptDto,
  CreateWarehouseDto,
  ListGoodsReceiptQueryDto,
  ListStockLedgerQueryDto,
  ListWarehouseQueryDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(@Inject(InventoryService) private readonly service: InventoryService) {}

  @Get('warehouses')
  @Permissions('Warehouse.VIEW')
  listWarehouses(@Query() query: ListWarehouseQueryDto) {
    return this.service.listWarehouses(query);
  }

  @Post('warehouses')
  @Permissions('Warehouse.CREATE')
  createWarehouse(@Body() dto: CreateWarehouseDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createWarehouse(dto, request.user?.sub ?? 'system');
  }

  @Get('goods-receipts')
  @Permissions('GoodsReceipt.VIEW')
  listGoodsReceipts(@Query() query: ListGoodsReceiptQueryDto) {
    return this.service.listGoodsReceipts(query);
  }

  @Post('goods-receipts')
  @Permissions('GoodsReceipt.CREATE')
  createGoodsReceipt(@Body() dto: CreateGoodsReceiptDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createGoodsReceipt(dto, request.user?.sub ?? 'system');
  }

  @Get('stock-ledger')
  @Permissions('StockLedger.VIEW')
  listStockLedger(@Query() query: ListStockLedgerQueryDto) {
    return this.service.listStockLedger(query);
  }

  @Get('projects/:projectId/stock-summary')
  @Permissions('StockLedger.VIEW')
  stockSummary(@Param('projectId') projectId: string) {
    return this.service.stockSummary(projectId);
  }
}
