import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import {
  CreateChartOfAccountDto, CreateClientInvoiceDto, CreateCollectionDto, CreateJournalDto,
  CreatePaymentDto, CreateProgressClaimDto, CreateVendorInvoiceDto, ListChartOfAccountQueryDto,
  ListClientInvoiceQueryDto, ListCollectionQueryDto, ListJournalQueryDto, ListPaymentQueryDto,
  ListProgressClaimQueryDto, ListVendorInvoiceQueryDto, TrialBalanceQueryDto, CertifyClaimDto,
  CreateVariationDto, ListVariationQueryDto,
  CreateSubcontractDto, CreateSubcontractProgressDto, ListSubcontractQueryDto, ListSubcontractProgressQueryDto,
} from '../dto/finance.dto';
import { VendorInvoiceService } from '../../application/services/vendor-invoice.service';
import { PaymentService } from '../../application/services/payment.service';
import { ChartOfAccountService } from '../../application/services/chart-of-account.service';
import { JournalService } from '../../application/services/journal.service';
import { TrialBalanceService } from '../../application/services/trial-balance.service';
import { ProgressClaimService } from '../../application/services/progress-claim.service';
import { ClientInvoiceService } from '../../application/services/client-invoice.service';
import { CollectionService } from '../../application/services/collection.service';
import { VariationService } from '../../application/services/variation.service';
import { SubcontractService } from '../../application/services/subcontract.service';

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
    @Inject(VariationService) private readonly variation: VariationService,
    @Inject(SubcontractService) private readonly subcon: SubcontractService,
  ) {}

  @Get('vendor-invoices')
  @Permissions(Permission.VendorInvoiceView)
  listVendorInvoices(@Query() query: ListVendorInvoiceQueryDto) {
    return this.vendorInvoice.listVendorInvoices(query);
  }

  @Post('vendor-invoices')
  @Permissions(Permission.VendorInvoiceCreate)
  createVendorInvoice(@Body() dto: CreateVendorInvoiceDto, @Req() request: { user?: { sub?: string } }) {
    return this.vendorInvoice.createVendorInvoice(dto, request.user?.sub ?? 'system');
  }

  @Post('vendor-invoices/:id/post')
  @Permissions(Permission.VendorInvoicePost)
  postVendorInvoice(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.vendorInvoice.postVendorInvoice(id, request.user?.sub ?? 'system');
  }

  @Get('payments')
  @Permissions(Permission.PaymentView)
  listPayments(@Query() query: ListPaymentQueryDto) {
    return this.payment.listPayments(query);
  }

  @Post('payments')
  @Permissions(Permission.PaymentCreate)
  createPayment(@Body() dto: CreatePaymentDto, @Req() request: { user?: { sub?: string } }) {
    return this.payment.createPayment(dto, request.user?.sub ?? 'system');
  }

  @Post('payments/:id/approve')
  @Permissions(Permission.PaymentApprove)
  approvePayment(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.payment.approvePayment(id, request.user?.sub ?? 'system');
  }

  @Post('payments/:id/pay')
  @Permissions(Permission.PaymentPay)
  payPayment(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.payment.payPayment(id, request.user?.sub ?? 'system');
  }

  @Get('chart-of-accounts')
  @Permissions(Permission.ChartOfAccountView)
  listChartOfAccounts(@Query() query: ListChartOfAccountQueryDto) {
    return this.coa.listChartOfAccounts(query);
  }

  @Get('gl/trial-balance')
  @Permissions(Permission.JournalView)
  trialBalance(@Query() query: TrialBalanceQueryDto) {
    return this.tb.trialBalance(query.legalEntityId, query.from, query.to);
  }

  @Post('chart-of-accounts')
  @Permissions(Permission.ChartOfAccountCreate)
  createChartOfAccount(@Body() dto: CreateChartOfAccountDto, @Req() request: { user?: { sub?: string } }) {
    return this.coa.createChartOfAccount(dto, request.user?.sub ?? 'system');
  }

  @Get('journals')
  @Permissions(Permission.JournalView)
  listJournals(@Query() query: ListJournalQueryDto) {
    return this.journal.listJournals(query);
  }

  @Post('journals')
  @Permissions(Permission.JournalCreate)
  createJournal(@Body() dto: CreateJournalDto, @Req() request: { user?: { sub?: string } }) {
    return this.journal.createJournal(dto, request.user?.sub ?? 'system');
  }

  @Post('journals/:id/post')
  @Permissions(Permission.JournalPost)
  postJournal(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.journal.postJournal(id, request.user?.sub ?? 'system');
  }

  @Get('progress-claims')
  @Permissions(Permission.ProgressClaimView)
  listProgressClaims(@Query() query: ListProgressClaimQueryDto) {
    return this.claim.listProgressClaims(query);
  }

  @Post('progress-claims')
  @Permissions(Permission.ProgressClaimCreate)
  createProgressClaim(@Body() dto: CreateProgressClaimDto, @Req() request: { user?: { sub?: string } }) {
    return this.claim.createProgressClaim(dto, request.user?.sub ?? 'system');
  }

  @Post('progress-claims/:id/certify')
  @Permissions(Permission.ProgressClaimCertify)
  certifyClaim(@Param('id') id: string, @Body() dto: CertifyClaimDto, @Req() request: { user?: { sub?: string } }) {
    return this.claim.certifyClaim(id, dto, request.user?.sub ?? 'system');
  }

  @Get('client-invoices')
  @Permissions(Permission.ClientInvoiceView)
  listClientInvoices(@Query() query: ListClientInvoiceQueryDto) {
    return this.clientInvoice.listClientInvoices(query);
  }

  @Post('client-invoices')
  @Permissions(Permission.ClientInvoiceCreate)
  createClientInvoice(@Body() dto: CreateClientInvoiceDto, @Req() request: { user?: { sub?: string } }) {
    return this.clientInvoice.createClientInvoice(dto, request.user?.sub ?? 'system');
  }

  @Post('client-invoices/:id/post')
  @Permissions(Permission.ClientInvoicePost)
  postClientInvoice(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.clientInvoice.postClientInvoice(id, request.user?.sub ?? 'system');
  }

  @Get('collections')
  @Permissions(Permission.CollectionView)
  listCollections(@Query() query: ListCollectionQueryDto) {
    return this.collection.listCollections(query);
  }

  @Post('collections')
  @Permissions(Permission.CollectionCreate)
  createCollection(@Body() dto: CreateCollectionDto, @Req() request: { user?: { sub?: string } }) {
    return this.collection.createCollection(dto, request.user?.sub ?? 'system');
  }

  @Post('collections/:id/post')
  @Permissions(Permission.CollectionPost)
  postCollection(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.collection.postCollection(id, request.user?.sub ?? 'system');
  }

  @Get('variations')
  @Permissions(Permission.VariationView)
  listVariations(@Query() query: ListVariationQueryDto) {
    return this.variation.listVariations(query);
  }

  @Post('variations')
  @Permissions(Permission.VariationCreate)
  createVariation(@Body() dto: CreateVariationDto, @Req() request: { user?: { sub?: string } }) {
    return this.variation.createVariation(dto, request.user?.sub ?? 'system');
  }

  @Post('variations/:id/approve')
  @Permissions(Permission.VariationApprove)
  approveVariation(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.variation.approveVariation(id, request.user?.sub ?? 'system');
  }

  @Post('variations/:id/reject')
  @Permissions(Permission.VariationReject)
  rejectVariation(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.variation.rejectVariation(id, request.user?.sub ?? 'system');
  }

  @Get('subcontracts')
  @Permissions(Permission.SubcontractView)
  listSubcontracts(@Query() query: ListSubcontractQueryDto) {
    return this.subcon.listSubcontracts(query);
  }

  @Post('subcontracts')
  @Permissions(Permission.SubcontractCreate)
  createSubcontract(@Body() dto: CreateSubcontractDto, @Req() request: { user?: { sub?: string } }) {
    return this.subcon.createSubcontract(dto, request.user?.sub ?? 'system');
  }

  @Get('subcontracts/:id/progress')
  @Permissions(Permission.SubcontractView)
  listSubcontractProgress(@Param('id') id: string, @Query() query: ListSubcontractProgressQueryDto) {
    return this.subcon.listProgress(id, query);
  }

  @Post('subcontracts/:id/progress')
  @Permissions(Permission.SubcontractProgressCreate)
  createSubcontractProgress(@Param('id') id: string, @Body() dto: CreateSubcontractProgressDto, @Req() request: { user?: { sub?: string } }) {
    return this.subcon.createProgress({ ...dto, subcontractId: id }, request.user?.sub ?? 'system');
  }

  @Post('subcontracts/:id/progress/:progressId/verify')
  @Permissions(Permission.SubcontractProgressVerify)
  verifySubcontractProgress(@Param('id') id: string, @Param('progressId') progressId: string, @Req() request: { user?: { sub?: string } }) {
    return this.subcon.verifyProgress(id, progressId, request.user?.sub ?? 'system');
  }

  @Post('subcontracts/:id/progress/:progressId/reject')
  @Permissions(Permission.SubcontractProgressReject)
  rejectSubcontractProgress(@Param('id') id: string, @Param('progressId') progressId: string, @Req() request: { user?: { sub?: string } }) {
    return this.subcon.rejectProgress(id, progressId, request.user?.sub ?? 'system');
  }
}