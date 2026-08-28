import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import {
  CreateGoodsReceiptDto,
  CreateMaterialIssueDto,
  CreateStockAdjustmentDto,
  CreateStockOpnameDto,
  CreateStockTransferDto,
  CreateWarehouseDto,
  ListGoodsReceiptQueryDto,
  ListMaterialIssueQueryDto,
  ListStockLedgerQueryDto,
  ListStockTransferQueryDto,
  ListWarehouseQueryDto,
} from '../dto/inventory.dto';
import { WarehouseService } from '../../application/services/warehouse.service';
import { GoodsReceiptService } from '../../application/services/goods-receipt.service';
import { MaterialIssueService } from '../../application/services/material-issue.service';
import { StockTransferService } from '../../application/services/stock-transfer.service';
import { StockAdjustmentService } from '../../application/services/stock-adjustment.service';
import { StockOpnameService } from '../../application/services/stock-opname.service';
import { StockLedgerService } from '../../application/services/stock-ledger.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    @Inject(WarehouseService) private readonly warehouse: WarehouseService,
    @Inject(GoodsReceiptService) private readonly gr: GoodsReceiptService,
    @Inject(MaterialIssueService) private readonly issue: MaterialIssueService,
    @Inject(StockTransferService) private readonly transfer: StockTransferService,
    @Inject(StockAdjustmentService) private readonly adjustment: StockAdjustmentService,
    @Inject(StockOpnameService) private readonly opname: StockOpnameService,
    @Inject(StockLedgerService) private readonly ledger: StockLedgerService,
  ) {}

  @Get('warehouses')
  @Permissions(Permission.WarehouseView)
  listWarehouses(@Query() query: ListWarehouseQueryDto) {
    return this.warehouse.listWarehouses(query);
  }

  @Post('warehouses')
  @Permissions(Permission.WarehouseCreate)
  createWarehouse(@Body() dto: CreateWarehouseDto, @Req() request: { user?: { sub?: string } }) {
    return this.warehouse.createWarehouse(dto, request.user?.sub ?? 'system');
  }

  @Get('goods-receipts')
  @Permissions(Permission.GoodsReceiptView)
  listGoodsReceipts(@Query() query: ListGoodsReceiptQueryDto) {
    return this.gr.listGoodsReceipts(query);
  }

  @Post('goods-receipts')
  @Permissions(Permission.GoodsReceiptCreate)
  createGoodsReceipt(@Body() dto: CreateGoodsReceiptDto, @Req() request: { user?: { sub?: string } }) {
    return this.gr.createGoodsReceipt(dto, request.user?.sub ?? 'system');
  }

  @Get('material-issues')
  @Permissions(Permission.MaterialIssueView)
  listMaterialIssues(@Query() query: ListMaterialIssueQueryDto) {
    return this.issue.listMaterialIssues(query);
  }

  @Post('material-issues')
  @Permissions(Permission.MaterialIssueCreate)
  createMaterialIssue(@Body() dto: CreateMaterialIssueDto, @Req() request: { user?: { sub?: string } }) {
    return this.issue.createMaterialIssue(dto, request.user?.sub ?? 'system');
  }

  @Get('stock-adjustments')
  @Permissions(Permission.StockAdjustmentView)
  listStockAdjustments(@Query() query: { page?: number; pageSize?: number; projectId?: string }) {
    return this.adjustment.listStockAdjustments(query);
  }

  @Post('stock-adjustments')
  @Permissions(Permission.StockAdjustmentCreate)
  createStockAdjustment(@Body() dto: CreateStockAdjustmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.adjustment.createStockAdjustment(dto, request.user?.sub ?? 'system');
  }

  @Post('stock-adjustments/:id/approve')
  @Permissions(Permission.StockAdjustmentApprove)
  approveStockAdjustment(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.adjustment.approveStockAdjustment(id, request.user?.sub ?? 'system');
  }

  @Get('stock-opnames')
  @Permissions(Permission.StockOpnameView)
  listStockOpnames(@Query() query: { page?: number; pageSize?: number; projectId?: string }) {
    return this.opname.listStockOpnames(query);
  }

  @Post('stock-opnames')
  @Permissions(Permission.StockOpnameCreate)
  createStockOpname(@Body() dto: CreateStockOpnameDto, @Req() request: { user?: { sub?: string } }) {
    return this.opname.createStockOpname(dto, request.user?.sub ?? 'system');
  }

  @Get('stock-transfers')
  @Permissions(Permission.StockTransferView)
  listStockTransfers(@Query() query: ListStockTransferQueryDto) {
    return this.transfer.listStockTransfers(query);
  }

  @Post('stock-transfers')
  @Permissions(Permission.StockTransferCreate)
  createStockTransfer(@Body() dto: CreateStockTransferDto, @Req() request: { user?: { sub?: string } }) {
    return this.transfer.createStockTransfer(dto, request.user?.sub ?? 'system');
  }

  @Get('stock-ledger')
  @Permissions(Permission.StockLedgerView)
  listStockLedger(@Query() query: ListStockLedgerQueryDto) {
    return this.ledger.listStockLedger(query);
  }

  @Get('projects/:projectId/stock-summary')
  @Permissions(Permission.StockLedgerView)
  stockSummary(@Param('projectId') projectId: string) {
    return this.ledger.stockSummary(projectId);
  }
}