import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { CreatePoDto, CreatePrDto, CreateQuoteDto, CreateRfqDto, ListPoQueryDto, ListPrQueryDto, ListRfqQueryDto } from '../dto/procurement.dto';
import { PurchaseRequisitionService } from '../../application/services/purchase-requisition.service';
import { PurchaseOrderService } from '../../application/services/purchase-order.service';
import { RfqService } from '../../application/services/rfq.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class ProcurementController {
  constructor(
    @Inject(PurchaseRequisitionService) private readonly pr: PurchaseRequisitionService,
    @Inject(PurchaseOrderService) private readonly po: PurchaseOrderService,
    @Inject(RfqService) private readonly rfq: RfqService,
  ) {}

  @Get('purchase-requisitions')
  @Permissions(Permission.PurchaseRequisitionView)
  listPr(@Query() query: ListPrQueryDto) {
    return this.pr.listPr(query);
  }

  @Post('purchase-requisitions')
  @Permissions(Permission.PurchaseRequisitionCreate)
  createPr(@Body() dto: CreatePrDto, @Req() request: { user?: { sub?: string } }) {
    return this.pr.createPr(dto, request.user?.sub ?? 'system');
  }

  @Get('purchase-orders')
  @Permissions(Permission.PurchaseOrderView)
  listPo(@Query() query: ListPoQueryDto) {
    return this.po.listPo(query);
  }

  @Post('purchase-orders')
  @Permissions(Permission.PurchaseOrderCreate)
  createPo(@Body() dto: CreatePoDto, @Req() request: { user?: { sub?: string } }) {
    return this.po.createPo(dto, request.user?.sub ?? 'system');
  }

  @Post('purchase-orders/:id/release')
  @Permissions(Permission.PurchaseOrderRelease)
  releasePo(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.po.releasePo(id, request.user?.sub ?? 'system');
  }

  @Get('rfqs')
  @Permissions(Permission.RfqView)
  listRfqs(@Query() query: ListRfqQueryDto) {
    return this.rfq.listRfqs(query);
  }

  @Post('rfqs')
  @Permissions(Permission.RfqCreate)
  createRfq(@Body() dto: CreateRfqDto, @Req() request: { user?: { sub?: string } }) {
    return this.rfq.createRfq(dto, request.user?.sub ?? 'system');
  }

  @Post('rfqs/:id/send')
  @Permissions(Permission.RfqSend)
  sendRfq(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.rfq.sendRfq(id, request.user?.sub ?? 'system');
  }

  @Post('rfqs/:id/quotes')
  @Permissions(Permission.RfqQuote)
  createQuote(@Param('id') id: string, @Body() dto: CreateQuoteDto, @Req() request: { user?: { sub?: string } }) {
    return this.rfq.createQuote(id, dto, request.user?.sub ?? 'system');
  }

  @Post('rfqs/:id/evaluate')
  @Permissions(Permission.RfqEvaluate)
  evaluateRfq(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.rfq.evaluateRfq(id, request.user?.sub ?? 'system');
  }
}