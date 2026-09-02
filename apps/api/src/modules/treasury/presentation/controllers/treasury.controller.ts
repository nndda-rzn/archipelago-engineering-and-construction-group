import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { BankAccountService } from '../../application/services/bank-account.service';
import { PaymentProposalService } from '../../application/services/payment-proposal.service';
import { BankGuaranteeService } from '../../application/services/bank-guarantee.service';
import { CashForecastService } from '../../application/services/cash-forecast.service';
import { FxExposureService } from '../../application/services/fx-exposure.service';
import {
  CreateBankAccountDto, CreateBankGuaranteeDto, CreateCashForecastDto, CreateFxExposureDto,
  CreatePaymentProposalDto, ListBankAccountQueryDto, ListBankGuaranteeQueryDto, ListPaymentProposalQueryDto,
} from '../dto/treasury.dto';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class TreasuryController {
  constructor(
    @Inject(BankAccountService) private readonly bankAccount: BankAccountService,
    @Inject(PaymentProposalService) private readonly paymentProposal: PaymentProposalService,
    @Inject(BankGuaranteeService) private readonly bankGuarantee: BankGuaranteeService,
    @Inject(CashForecastService) private readonly cashForecast: CashForecastService,
    @Inject(FxExposureService) private readonly fxExposure: FxExposureService,
  ) {}

  @Get('treasury/bank-accounts')
  @Permissions(Permission.TreasuryView)
  listBankAccounts(@Query() query: ListBankAccountQueryDto) {
    return this.bankAccount.listBankAccounts(query);
  }

  @Post('treasury/bank-accounts')
  @Permissions(Permission.TreasuryCreate)
  createBankAccount(@Body() dto: CreateBankAccountDto, @Req() request: { user?: { sub?: string } }) {
    return this.bankAccount.createBankAccount(dto, request.user?.sub ?? 'system');
  }

  @Get('treasury/cash-position')
  @Permissions(Permission.TreasuryView)
  cashPosition() {
    return this.bankAccount.cashPosition();
  }

  @Get('treasury/payment-proposals')
  @Permissions(Permission.TreasuryView)
  listPaymentProposals(@Query() query: ListPaymentProposalQueryDto) {
    return this.paymentProposal.listPaymentProposals(query);
  }

  @Post('treasury/payment-proposals')
  @Permissions(Permission.TreasuryCreate)
  createPaymentProposal(@Body() dto: CreatePaymentProposalDto, @Req() request: { user?: { sub?: string } }) {
    return this.paymentProposal.createPaymentProposal(dto, request.user?.sub ?? 'system');
  }

  @Post('treasury/payment-proposals/:id/submit')
  @Permissions(Permission.TreasuryApprove)
  submitProposal(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.paymentProposal.submitProposal(id, request.user?.sub ?? 'system');
  }

  @Post('treasury/payment-proposals/:id/approve')
  @Permissions(Permission.TreasuryApprove)
  approveProposal(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.paymentProposal.approveProposal(id, request.user?.sub ?? 'system');
  }

  @Post('treasury/payment-proposals/:id/release')
  @Permissions(Permission.TreasuryRelease)
  releaseProposal(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.paymentProposal.releaseProposal(id, request.user?.sub ?? 'system');
  }

  @Get('treasury/bank-guarantees')
  @Permissions(Permission.TreasuryView)
  listBankGuarantees(@Query() query: ListBankGuaranteeQueryDto) {
    return this.bankGuarantee.listBankGuarantees(query);
  }

  @Post('treasury/bank-guarantees')
  @Permissions(Permission.TreasuryCreate)
  createBankGuarantee(@Body() dto: CreateBankGuaranteeDto, @Req() request: { user?: { sub?: string } }) {
    return this.bankGuarantee.createBankGuarantee(dto, request.user?.sub ?? 'system');
  }

  @Get('treasury/cash-forecasts')
  @Permissions(Permission.TreasuryView)
  listCashForecasts() {
    return this.cashForecast.listCashForecasts();
  }

  @Post('treasury/cash-forecasts')
  @Permissions(Permission.TreasuryCreate)
  createCashForecast(@Body() dto: CreateCashForecastDto, @Req() request: { user?: { sub?: string } }) {
    return this.cashForecast.createCashForecast(dto, request.user?.sub ?? 'system');
  }

  @Get('treasury/fx-exposures')
  @Permissions(Permission.TreasuryView)
  listFxExposures() {
    return this.fxExposure.listFxExposures();
  }

  @Post('treasury/fx-exposures')
  @Permissions(Permission.TreasuryCreate)
  createFxExposure(@Body() dto: CreateFxExposureDto, @Req() request: { user?: { sub?: string } }) {
    return this.fxExposure.createFxExposure(dto, request.user?.sub ?? 'system');
  }
}
