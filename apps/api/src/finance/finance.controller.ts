import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import { CreateChartOfAccountDto, CreateJournalDto, CreatePaymentDto, CreateVendorInvoiceDto, ListChartOfAccountQueryDto, ListJournalQueryDto, ListPaymentQueryDto, ListVendorInvoiceQueryDto, TrialBalanceQueryDto } from './dto/finance.dto';
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

  @Get('chart-of-accounts')
  @Permissions('ChartOfAccount.VIEW')
  listChartOfAccounts(@Query() query: ListChartOfAccountQueryDto) {
    return this.service.listChartOfAccounts(query);
  }

  @Get('gl/trial-balance')
  @Permissions('Journal.VIEW')
  trialBalance(@Query() query: TrialBalanceQueryDto) {
    return this.service.trialBalance(query.legalEntityId, query.from, query.to);
  }

  @Post('chart-of-accounts')
  @Permissions('ChartOfAccount.CREATE')
  createChartOfAccount(@Body() dto: CreateChartOfAccountDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createChartOfAccount(dto, request.user?.sub ?? 'system');
  }

  @Get('journals')
  @Permissions('Journal.VIEW')
  listJournals(@Query() query: ListJournalQueryDto) {
    return this.service.listJournals(query);
  }

  @Post('journals')
  @Permissions('Journal.CREATE')
  createJournal(@Body() dto: CreateJournalDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createJournal(dto, request.user?.sub ?? 'system');
  }

  @Post('journals/:id/post')
  @Permissions('Journal.POST')
  postJournal(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.service.postJournal(id, request.user?.sub ?? 'system');
  }
}
