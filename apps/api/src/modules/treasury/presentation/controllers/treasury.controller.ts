import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
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
  @Permissions(Permission.TreasuryView)
  listBankAccounts(@Query() query: ListBankAccountQueryDto) {
    return this.treasury.listBankAccounts(query);
  }

  @Post('treasury/bank-accounts')
  @Permissions(Permission.TreasuryCreate)
  createBankAccount(@Body() dto: CreateBankAccountDto, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.createBankAccount(dto, request.user?.sub ?? 'system');
  }

  @Get('treasury/cash-position')
  @Permissions(Permission.TreasuryView)
  cashPosition() {
    return this.treasury.cashPosition();
  }

  @Get('treasury/payment-proposals')
  @Permissions(Permission.TreasuryView)
  listPaymentProposals(@Query() query: ListPaymentProposalQueryDto) {
    return this.treasury.listPaymentProposals(query);
  }

  @Post('treasury/payment-proposals')
  @Permissions(Permission.TreasuryCreate)
  createPaymentProposal(@Body() dto: CreatePaymentProposalDto, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.createPaymentProposal(dto, request.user?.sub ?? 'system');
  }

  @Post('treasury/payment-proposals/:id/submit')
  @Permissions(Permission.TreasuryApprove)
  submitProposal(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.submitProposal(id, request.user?.sub ?? 'system');
  }

  @Post('treasury/payment-proposals/:id/approve')
  @Permissions(Permission.TreasuryApprove)
  approveProposal(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.approveProposal(id, request.user?.sub ?? 'system');
  }

  @Post('treasury/payment-proposals/:id/release')
  @Permissions(Permission.TreasuryRelease)
  releaseProposal(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.releaseProposal(id, request.user?.sub ?? 'system');
  }

  @Get('treasury/bank-guarantees')
  @Permissions(Permission.TreasuryView)
  listBankGuarantees(@Query() query: ListBankGuaranteeQueryDto) {
    return this.treasury.listBankGuarantees(query);
  }

  @Post('treasury/bank-guarantees')
  @Permissions(Permission.TreasuryCreate)
  createBankGuarantee(@Body() dto: CreateBankGuaranteeDto, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.createBankGuarantee(dto, request.user?.sub ?? 'system');
  }

  @Get('treasury/cash-forecasts')
  @Permissions(Permission.TreasuryView)
  listCashForecasts() {
    return this.treasury.listCashForecasts();
  }

  @Post('treasury/cash-forecasts')
  @Permissions(Permission.TreasuryCreate)
  createCashForecast(@Body() dto: CreateCashForecastDto, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.createCashForecast(dto, request.user?.sub ?? 'system');
  }

  @Get('treasury/fx-exposures')
  @Permissions(Permission.TreasuryView)
  listFxExposures() {
    return this.treasury.listFxExposures();
  }

  @Post('treasury/fx-exposures')
  @Permissions(Permission.TreasuryCreate)
  createFxExposure(@Body() dto: CreateFxExposureDto, @Req() request: { user?: { sub?: string } }) {
    return this.treasury.createFxExposure(dto, request.user?.sub ?? 'system');
  }
}
