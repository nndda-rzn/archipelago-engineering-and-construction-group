import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import {
  CreateGoodsReceiptDto,
  CreateMaterialIssueDto,
  CreateStockAdjustmentDto,
  CreateStockOpnameDto,
  CreateWarehouseDto,
  ListGoodsReceiptQueryDto,
  ListMaterialIssueQueryDto,
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

  @Get('material-issues')
  @Permissions('MaterialIssue.VIEW')
  listMaterialIssues(@Query() query: ListMaterialIssueQueryDto) {
    return this.service.listMaterialIssues(query);
  }

  @Post('material-issues')
  @Permissions('MaterialIssue.CREATE')
  createMaterialIssue(@Body() dto: CreateMaterialIssueDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createMaterialIssue(dto, request.user?.sub ?? 'system');
  }

  @Get('stock-adjustments')
  @Permissions('StockAdjustment.VIEW')
  listStockAdjustments(@Query() query: { page?: number; pageSize?: number; projectId?: string }) {
    return this.service.listStockAdjustments(query);
  }

  @Post('stock-adjustments')
  @Permissions('StockAdjustment.CREATE')
  createStockAdjustment(@Body() dto: CreateStockAdjustmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createStockAdjustment(dto, request.user?.sub ?? 'system');
  }

  @Post('stock-adjustments/:id/approve')
  @Permissions('StockAdjustment.APPROVE')
  approveStockAdjustment(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.approveStockAdjustment(id, request.user?.sub ?? 'system');
  }

  @Get('stock-opnames')
  @Permissions('StockOpname.VIEW')
  listStockOpnames(@Query() query: { page?: number; pageSize?: number; projectId?: string }) {
    return this.service.listStockOpnames(query);
  }

  @Post('stock-opnames')
  @Permissions('StockOpname.CREATE')
  createStockOpname(@Body() dto: CreateStockOpnameDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createStockOpname(dto, request.user?.sub ?? 'system');
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
