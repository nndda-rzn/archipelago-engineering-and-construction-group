import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { CreatePoDto, CreatePrDto, ListPoQueryDto, ListPrQueryDto } from './dto/procurement.dto';
import { ProcurementService } from './procurement.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class ProcurementController {
  constructor(@Inject(ProcurementService) private readonly service: ProcurementService) {}

  @Get('purchase-requisitions')
  @Permissions('PurchaseRequisition.VIEW')
  listPr(@Query() query: ListPrQueryDto) {
    return this.service.listPr(query);
  }

  @Post('purchase-requisitions')
  @Permissions('PurchaseRequisition.CREATE')
  createPr(@Body() dto: CreatePrDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createPr(dto, request.user?.sub ?? 'system');
  }

  @Get('purchase-orders')
  @Permissions('PurchaseOrder.VIEW')
  listPo(@Query() query: ListPoQueryDto) {
    return this.service.listPo(query);
  }

  @Post('purchase-orders')
  @Permissions('PurchaseOrder.CREATE')
  createPo(@Body() dto: CreatePoDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createPo(dto, request.user?.sub ?? 'system');
  }

  @Post('purchase-orders/:id/release')
  @Permissions('PurchaseOrder.RELEASE')
  releasePo(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.releasePo(id, request.user?.sub ?? 'system');
  }
}
