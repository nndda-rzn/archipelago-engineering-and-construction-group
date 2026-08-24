import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { CreatePaymentDto, CreateVendorInvoiceDto, ListPaymentQueryDto, ListVendorInvoiceQueryDto } from './dto/finance.dto';
import { FinanceService } from './finance.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(@Inject(FinanceService) private readonly service: FinanceService) {}

  @Get('vendor-invoices')
  @Permissions('VendorInvoice.VIEW')
  listVendorInvoices(@Query() query: ListVendorInvoiceQueryDto) {
    return this.service.listVendorInvoices(query);
  }

  @Post('vendor-invoices')
  @Permissions('VendorInvoice.CREATE')
  createVendorInvoice(@Body() dto: CreateVendorInvoiceDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createVendorInvoice(dto, request.user?.sub ?? 'system');
  }

  @Post('vendor-invoices/:id/post')
  @Permissions('VendorInvoice.POST')
  postVendorInvoice(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.postVendorInvoice(id, request.user?.sub ?? 'system');
  }

  @Get('payments')
  @Permissions('Payment.VIEW')
  listPayments(@Query() query: ListPaymentQueryDto) {
    return this.service.listPayments(query);
  }

  @Post('payments')
  @Permissions('Payment.CREATE')
  createPayment(@Body() dto: CreatePaymentDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createPayment(dto, request.user?.sub ?? 'system');
  }

  @Post('payments/:id/approve')
  @Permissions('Payment.APPROVE')
  approvePayment(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.approvePayment(id, request.user?.sub ?? 'system');
  }

  @Post('payments/:id/pay')
  @Permissions('Payment.PAY')
  payPayment(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.payPayment(id, request.user?.sub ?? 'system');
  }
}
