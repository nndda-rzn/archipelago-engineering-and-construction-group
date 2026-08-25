import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/auth/auth.guard';
import { Permissions } from '@/auth/permissions.decorator';
import { PermissionsGuard } from '@/auth/permissions.guard';
import {
  CreateChartOfAccountDto, CreateClientInvoiceDto, CreateCollectionDto, CreateJournalDto,
  CreatePaymentDto, CreateProgressClaimDto, CreateVendorInvoiceDto, ListChartOfAccountQueryDto,
  ListClientInvoiceQueryDto, ListCollectionQueryDto, ListJournalQueryDto, ListPaymentQueryDto,
  ListProgressClaimQueryDto, ListVendorInvoiceQueryDto, TrialBalanceQueryDto, CertifyClaimDto,
} from './dto/finance.dto';
import { VendorInvoiceService } from './services/vendor-invoice.service';
import { PaymentService } from './services/payment.service';
import { ChartOfAccountService } from './services/chart-of-account.service';
import { JournalService } from './services/journal.service';
import { TrialBalanceService } from './services/trial-balance.service';
import { ProgressClaimService } from './services/progress-claim.service';
import { ClientInvoiceService } from './services/client-invoice.service';
import { CollectionService } from './services/collection.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(
    @Inject(VendorInvoiceService) private readonly vendorInvoice: VendorInvoiceService,
    @Inject(PaymentService) private readonly payment: PaymentService,
    @Inject(ChartOfAccountService) private readonly coa: ChartOfAccountService,
    @Inject(JournalService) private readonly journal: JournalService,
    @Inject(TrialBalanceService) private readonly tb: TrialBalanceService,
    @Inject(ProgressClaimService) private readonly claim: ProgressClaimService,
    @Inject(ClientInvoiceService) private readonly clientInvoice: ClientInvoiceService,
    @Inject(CollectionService) private readonly collection: CollectionService,
  ) {}

  @Get('vendor-invoices')
  @Permissions('VendorInvoice.VIEW')
  listVendorInvoices(@Query() query: ListVendorInvoiceQueryDto) {
    return this.vendorInvoice.listVendorInvoices(query);
  }

  @Post('vendor-invoices')
  @Permissions('VendorInvoice.CREATE')
  createVendorInvoice(@Body() dto: CreateVendorInvoiceDto, @Req() request: { user?: { sub?: string } }) {
    return this.vendorInvoice.createVendorInvoice(dto, request.user?.sub ?? 'system');
  }

  @Post('vendor-invoices/:id/post')
  @Permissions('VendorInvoice.POST')
  postVendorInvoice(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.vendorInvoice.postVendorInvoice(id, request.user?.sub ?? 'system');
  }

  @Get('payments')
  @Permissions('Payment.VIEW')
  listPayments(@Query() query: ListPaymentQueryDto) {
    return this.payment.listPayments(query);
  }

  @Post('payments')
  @Permissions('Payment.CREATE')
  createPayment(@Body() dto: CreatePaymentDto, @Req() request: { user?: { sub?: string } }) {
    return this.payment.createPayment(dto, request.user?.sub ?? 'system');
  }

  @Post('payments/:id/approve')
  @Permissions('Payment.APPROVE')
  approvePayment(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.payment.approvePayment(id, request.user?.sub ?? 'system');
  }

  @Post('payments/:id/pay')
  @Permissions('Payment.PAY')
  payPayment(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.payment.payPayment(id, request.user?.sub ?? 'system');
  }

  @Get('chart-of-accounts')
  @Permissions('ChartOfAccount.VIEW')
  listChartOfAccounts(@Query() query: ListChartOfAccountQueryDto) {
    return this.coa.listChartOfAccounts(query);
  }

  @Get('gl/trial-balance')
  @Permissions('Journal.VIEW')
  trialBalance(@Query() query: TrialBalanceQueryDto) {
    return this.tb.trialBalance(query.legalEntityId, query.from, query.to);
  }

  @Post('chart-of-accounts')
  @Permissions('ChartOfAccount.CREATE')
  createChartOfAccount(@Body() dto: CreateChartOfAccountDto, @Req() request: { user?: { sub?: string } }) {
    return this.coa.createChartOfAccount(dto, request.user?.sub ?? 'system');
  }

  @Get('journals')
  @Permissions('Journal.VIEW')
  listJournals(@Query() query: ListJournalQueryDto) {
    return this.journal.listJournals(query);
  }

  @Post('journals')
  @Permissions('Journal.CREATE')
  createJournal(@Body() dto: CreateJournalDto, @Req() request: { user?: { sub?: string } }) {
    return this.journal.createJournal(dto, request.user?.sub ?? 'system');
  }

  @Post('journals/:id/post')
  @Permissions('Journal.POST')
  postJournal(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.journal.postJournal(id, request.user?.sub ?? 'system');
  }

  @Get('progress-claims')
  @Permissions('ProgressClaim.VIEW')
  listProgressClaims(@Query() query: ListProgressClaimQueryDto) {
    return this.claim.listProgressClaims(query);
  }

  @Post('progress-claims')
  @Permissions('ProgressClaim.CREATE')
  createProgressClaim(@Body() dto: CreateProgressClaimDto, @Req() request: { user?: { sub?: string } }) {
    return this.claim.createProgressClaim(dto, request.user?.sub ?? 'system');
  }

  @Post('progress-claims/:id/certify')
  @Permissions('ProgressClaim.CERTIFY')
  certifyClaim(@Param('id') id: string, @Body() dto: CertifyClaimDto, @Req() request: { user?: { sub?: string } }) {
    return this.claim.certifyClaim(id, dto, request.user?.sub ?? 'system');
  }

  @Get('client-invoices')
  @Permissions('ClientInvoice.VIEW')
  listClientInvoices(@Query() query: ListClientInvoiceQueryDto) {
    return this.clientInvoice.listClientInvoices(query);
  }

  @Post('client-invoices')
  @Permissions('ClientInvoice.CREATE')
  createClientInvoice(@Body() dto: CreateClientInvoiceDto, @Req() request: { user?: { sub?: string } }) {
    return this.clientInvoice.createClientInvoice(dto, request.user?.sub ?? 'system');
  }

  @Post('client-invoices/:id/post')
  @Permissions('ClientInvoice.POST')
  postClientInvoice(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.clientInvoice.postClientInvoice(id, request.user?.sub ?? 'system');
  }

  @Get('collections')
  @Permissions('Collection.VIEW')
  listCollections(@Query() query: ListCollectionQueryDto) {
    return this.collection.listCollections(query);
  }

  @Post('collections')
  @Permissions('Collection.CREATE')
  createCollection(@Body() dto: CreateCollectionDto, @Req() request: { user?: { sub?: string } }) {
    return this.collection.createCollection(dto, request.user?.sub ?? 'system');
  }

  @Post('collections/:id/post')
  @Permissions('Collection.POST')
  postCollection(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.collection.postCollection(id, request.user?.sub ?? 'system');
  }
}