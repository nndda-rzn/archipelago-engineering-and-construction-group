import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { OrganizationService } from '../../application/services/organization.service';
import { DoaService } from '../../application/services/doa.service';
import { CurrencyService } from '../../application/services/currency.service';
import {
  CreateCurrencyDto, CreateDoaRuleDto, CreateExchangeRateDto, CreateOrganizationDto, ResolveDoaDto, SetStatusDto, UpdateDoaRuleDto, UpdateOrganizationDto,
} from '../dto/foundation-hardening.dto';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class FoundationHardeningController {
  constructor(
    @Inject(OrganizationService) private readonly organization: OrganizationService,
    @Inject(DoaService) private readonly doa: DoaService,
    @Inject(CurrencyService) private readonly currency: CurrencyService,
  ) {}

  @Get('legal-entities/:id/organizations')
  @Permissions(Permission.FoundationHardeningView, Permission.LegalEntityView)
  listOrganizations(@Param('id') id: string, @Query('asOf') asOf?: string) {
    return this.organization.listOrganizations(id, asOf);
  }

  @Post('organizations')
  @Permissions(Permission.FoundationHardeningView, Permission.LegalEntityEdit)
  createOrganization(@Body() dto: CreateOrganizationDto, @Req() request: { user?: { sub?: string } }) {
    return this.organization.createOrganization(dto, request.user?.sub ?? 'system');
  }

  @Patch('organizations/:id')
  @Permissions(Permission.FoundationHardeningView, Permission.LegalEntityEdit)
  updateOrganization(@Param('id') id: string, @Body() dto: UpdateOrganizationDto, @Req() request: { user?: { sub?: string } }) {
    return this.organization.updateOrganization(id, dto, request.user?.sub ?? 'system');
  }

  @Post('organizations/:id/status')
  @Permissions(Permission.FoundationHardeningView, Permission.LegalEntityEdit)
  setOrganizationStatus(@Param('id') id: string, @Body() dto: SetStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.organization.setStatus(id, dto.status, request.user?.sub ?? 'system');
  }

  @Get('doa-rules')
  @Permissions(Permission.FoundationHardeningView, Permission.RoleView)
  listDoaRules() {
    return this.doa.listDoaRules();
  }

  // Rute statis `analysis` harus lebih dulu dari `:id`.
  @Get('doa-rules/analysis')
  @Permissions(Permission.FoundationHardeningView, Permission.RoleView)
  doaAnalysis(@Query('transactionType') transactionType: string) {
    return this.doa.analyzeRules(transactionType);
  }

  @Post('doa-rules')
  @Permissions(Permission.FoundationHardeningView, Permission.RoleCreate)
  createDoaRule(@Body() dto: CreateDoaRuleDto, @Req() request: { user?: { sub?: string } }) {
    return this.doa.createDoaRule(dto, request.user?.sub ?? 'system');
  }

  @Patch('doa-rules/:id')
  @Permissions(Permission.FoundationHardeningView, Permission.RoleCreate)
  updateDoaRule(@Param('id') id: string, @Body() dto: UpdateDoaRuleDto, @Req() request: { user?: { sub?: string } }) {
    return this.doa.updateDoaRule(id, dto, request.user?.sub ?? 'system');
  }

  @Post('doa-rules/:id/status')
  @Permissions(Permission.FoundationHardeningView, Permission.RoleCreate)
  setDoaRuleStatus(@Param('id') id: string, @Body() dto: SetStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.doa.setStatus(id, dto.status, request.user?.sub ?? 'system');
  }

  @Post('doa/resolve')
  @Permissions(Permission.FoundationHardeningView, Permission.RoleView)
  resolveDoa(@Body() dto: ResolveDoaDto) {
    return this.doa.resolveDoa(dto);
  }

  @Get('currencies')
  @Permissions(Permission.FoundationHardeningView, Permission.LegalEntityView)
  listCurrencies() {
    return this.currency.listCurrencies();
  }

  @Post('currencies')
  @Permissions(Permission.FoundationHardeningView, Permission.LegalEntityEdit)
  createCurrency(@Body() dto: CreateCurrencyDto, @Req() request: { user?: { sub?: string } }) {
    return this.currency.createCurrency(dto, request.user?.sub ?? 'system');
  }

  @Post('currencies/:id/status')
  @Permissions(Permission.FoundationHardeningView, Permission.LegalEntityEdit)
  setCurrencyStatus(@Param('id') id: string, @Body() dto: SetStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.currency.setCurrencyStatus(id, dto.status, request.user?.sub ?? 'system');
  }

  @Get('exchange-rates')
  @Permissions(Permission.FoundationHardeningView, Permission.LegalEntityView)
  listExchangeRates() {
    return this.currency.listExchangeRates();
  }

  // Rute statis `history` harus lebih dulu dari rute `:id` bila ada.
  @Get('exchange-rates/history')
  @Permissions(Permission.FoundationHardeningView, Permission.LegalEntityView)
  rateHistory(
    @Query('fromCurrencyId') fromCurrencyId: string,
    @Query('toCurrencyId') toCurrencyId: string,
    @Query('rateType') rateType?: string,
  ) {
    return this.currency.rateHistory(fromCurrencyId, toCurrencyId, rateType);
  }

  @Post('exchange-rates')
  @Permissions(Permission.FoundationHardeningView, Permission.LegalEntityEdit)
  createExchangeRate(@Body() dto: CreateExchangeRateDto, @Req() request: { user?: { sub?: string } }) {
    return this.currency.createExchangeRate(dto, request.user?.sub ?? 'system');
  }

  @Post('currencies/revalue')
  @Permissions(Permission.FoundationHardeningView, Permission.LegalEntityView)
  revalue(@Body() dto: { amount: number; fromCurrencyCode: string; toCurrencyCode: string; asOf?: string }) {
    return this.currency.revalue(dto.amount, dto.fromCurrencyCode, dto.toCurrencyCode, dto.asOf);
  }
}
