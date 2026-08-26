import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { TreasuryService } from '../../application/services/treasury.service';
import {
  CreateBankAccountDto, CreateBankGuaranteeDto, CreateCashForecastDto, CreateFxExposureDto,
  CreatePaymentProposalDto, ListBankAccountQueryDto, ListBankGuaranteeQueryDto, ListPaymentProposalQueryDto,
} from '../dto/treasury.dto';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class TreasuryController {
  constructor(@Inject(TreasuryService) private readonly treasury: TreasuryService) {}

  @Get('treasury/bank-accounts')
  @Permissions('Treasury.VIEW')
  listBankAccounts(@Query() query: ListBankAccountQueryDto) {
    return this.treasury.listBankAccounts(query);
  }

  @Post('treasury/bank-accounts')
  @Permissions('Treasury.CREATE')
  createBankAccount(@Body() dto: CreateBankAccountDto, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.createBankAccount(dto, request.user?.sub ?? 'system');
  }

  @Get('treasury/cash-position')
  @Permissions('Treasury.VIEW')
  cashPosition() {
    return this.treasury.cashPosition();
  }

  @Get('treasury/payment-proposals')
  @Permissions('Treasury.VIEW')
  listPaymentProposals(@Query() query: ListPaymentProposalQueryDto) {
    return this.treasury.listPaymentProposals(query);
  }

  @Post('treasury/payment-proposals')
  @Permissions('Treasury.CREATE')
  createPaymentProposal(@Body() dto: CreatePaymentProposalDto, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.createPaymentProposal(dto, request.user?.sub ?? 'system');
  }

  @Post('treasury/payment-proposals/:id/submit')
  @Permissions('Treasury.APPROVE')
  submitProposal(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.submitProposal(id, request.user?.sub ?? 'system');
  }

  @Post('treasury/payment-proposals/:id/approve')
  @Permissions('Treasury.APPROVE')
  approveProposal(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.approveProposal(id, request.user?.sub ?? 'system');
  }

  @Post('treasury/payment-proposals/:id/release')
  @Permissions('Treasury.RELEASE')
  releaseProposal(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.releaseProposal(id, request.user?.sub ?? 'system');
  }

  @Get('treasury/bank-guarantees')
  @Permissions('Treasury.VIEW')
  listBankGuarantees(@Query() query: ListBankGuaranteeQueryDto) {
    return this.treasury.listBankGuarantees(query);
  }

  @Post('treasury/bank-guarantees')
  @Permissions('Treasury.CREATE')
  createBankGuarantee(@Body() dto: CreateBankGuaranteeDto, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.createBankGuarantee(dto, request.user?.sub ?? 'system');
  }

  @Get('treasury/cash-forecasts')
  @Permissions('Treasury.VIEW')
  listCashForecasts() {
    return this.treasury.listCashForecasts();
  }

  @Post('treasury/cash-forecasts')
  @Permissions('Treasury.CREATE')
  createCashForecast(@Body() dto: CreateCashForecastDto, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.createCashForecast(dto, request.user?.sub ?? 'system');
  }

  @Get('treasury/fx-exposures')
  @Permissions('Treasury.VIEW')
  listFxExposures() {
    return this.treasury.listFxExposures();
  }

  @Post('treasury/fx-exposures')
  @Permissions('Treasury.CREATE')
  createFxExposure(@Body() dto: CreateFxExposureDto, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.createFxExposure(dto, request.user?.sub ?? 'system');
  }
}
