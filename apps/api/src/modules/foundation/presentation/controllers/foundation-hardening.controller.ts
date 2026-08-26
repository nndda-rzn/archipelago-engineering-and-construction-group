import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { FoundationHardeningService } from '../../application/services/foundation-hardening.service';
import {
  CreateCurrencyDto, CreateDoaRuleDto, CreateExchangeRateDto, CreateOrganizationDto, ResolveDoaDto,
} from '../dto/foundation-hardening.dto';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class FoundationHardeningController {
  constructor(@Inject(FoundationHardeningService) private readonly hardening: FoundationHardeningService) {}

  @Get('legal-entities/:id/organizations')
  @Permissions('LegalEntity.VIEW')
  listOrganizations(@Param('id') id: string, @Query('asOf') asOf?: string) {
    return this.hardening.listOrganizations(id, asOf);
  }

  @Post('organizations')
  @Permissions('LegalEntity.EDIT')
  createOrganization(@Body() dto: CreateOrganizationDto, @Req() request: { user?: { sub?: string } }) {
    return this.hardening.createOrganization(dto, request.user?.sub ?? 'system');
  }

  @Get('doa-rules')
  @Permissions('Role.VIEW')
  listDoaRules() {
    return this.hardening.listDoaRules();
  }

  @Post('doa-rules')
  @Permissions('Role.CREATE')
  createDoaRule(@Body() dto: CreateDoaRuleDto, @Req() request: { user?: { sub?: string } }) {
    return this.hardening.createDoaRule(dto, request.user?.sub ?? 'system');
  }

  @Post('doa/resolve')
  @Permissions('Role.VIEW')
  resolveDoa(@Body() dto: ResolveDoaDto) {
    return this.hardening.resolveDoa(dto);
  }

  @Get('currencies')
  @Permissions('LegalEntity.VIEW')
  listCurrencies() {
    return this.hardening.listCurrencies();
  }

  @Post('currencies')
  @Permissions('LegalEntity.EDIT')
  createCurrency(@Body() dto: CreateCurrencyDto, @Req() request: { user?: { sub?: string } }) {
    return this.hardening.createCurrency(dto, request.user?.sub ?? 'system');
  }

  @Get('exchange-rates')
  @Permissions('LegalEntity.VIEW')
  listExchangeRates() {
    return this.hardening.listExchangeRates();
  }

  @Post('exchange-rates')
  @Permissions('LegalEntity.EDIT')
  createExchangeRate(@Body() dto: CreateExchangeRateDto, @Req() request: { user?: { sub?: string } }) {
    return this.hardening.createExchangeRate(dto, request.user?.sub ?? 'system');
  }

  @Post('currencies/revalue')
  @Permissions('LegalEntity.VIEW')
  revalue(@Body() dto: { amount: number; fromCurrencyCode: string; toCurrencyCode: string; asOf?: string }) {
    return this.hardening.revalue(dto.amount, dto.fromCurrencyCode, dto.toCurrencyCode, dto.asOf);
  }
}
