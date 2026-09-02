import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { OrganizationService } from '../../application/services/organization.service';
import { DoaService } from '../../application/services/doa.service';
import { CurrencyService } from '../../application/services/currency.service';
import {
  CreateCurrencyDto, CreateDoaRuleDto, CreateExchangeRateDto, CreateOrganizationDto, ResolveDoaDto,
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
  @Permissions(Permission.LegalEntityView)
  listOrganizations(@Param('id') id: string, @Query('asOf') asOf?: string) {
    return this.organization.listOrganizations(id, asOf);
  }

  @Post('organizations')
  @Permissions(Permission.LegalEntityEdit)
  createOrganization(@Body() dto: CreateOrganizationDto, @Req() request: { user?: { sub?: string } }) {
    return this.organization.createOrganization(dto, request.user?.sub ?? 'system');
  }

  @Get('doa-rules')
  @Permissions(Permission.RoleView)
  listDoaRules() {
    return this.doa.listDoaRules();
  }

  @Post('doa-rules')
  @Permissions(Permission.RoleCreate)
  createDoaRule(@Body() dto: CreateDoaRuleDto, @Req() request: { user?: { sub?: string } }) {
    return this.doa.createDoaRule(dto, request.user?.sub ?? 'system');
  }

  @Post('doa/resolve')
  @Permissions(Permission.RoleView)
  resolveDoa(@Body() dto: ResolveDoaDto) {
    return this.doa.resolveDoa(dto);
  }

  @Get('currencies')
  @Permissions(Permission.LegalEntityView)
  listCurrencies() {
    return this.currency.listCurrencies();
  }

  @Post('currencies')
  @Permissions(Permission.LegalEntityEdit)
  createCurrency(@Body() dto: CreateCurrencyDto, @Req() request: { user?: { sub?: string } }) {
    return this.currency.createCurrency(dto, request.user?.sub ?? 'system');
  }

  @Get('exchange-rates')
  @Permissions(Permission.LegalEntityView)
  listExchangeRates() {
    return this.currency.listExchangeRates();
  }

  @Post('exchange-rates')
  @Permissions(Permission.LegalEntityEdit)
  createExchangeRate(@Body() dto: CreateExchangeRateDto, @Req() request: { user?: { sub?: string } }) {
    return this.currency.createExchangeRate(dto, request.user?.sub ?? 'system');
  }

  @Post('currencies/revalue')
  @Permissions(Permission.LegalEntityView)
  revalue(@Body() dto: { amount: number; fromCurrencyCode: string; toCurrencyCode: string; asOf?: string }) {
    return this.currency.revalue(dto.amount, dto.fromCurrencyCode, dto.toCurrencyCode, dto.asOf);
  }
}
