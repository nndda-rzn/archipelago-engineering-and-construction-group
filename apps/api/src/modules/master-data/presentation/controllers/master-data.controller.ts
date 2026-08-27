import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import {
  CreateFiscalPeriodDto, CreateVendorDto, ListFiscalPeriodQueryDto, ListVendorQueryDto, UpdateFiscalPeriodStatusDto,
} from '../dto/master-data.dto';
import { MasterDataService } from '../../application/services/master-data.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class MasterDataController {
  constructor(
    @Inject(MasterDataService) private readonly masterData: MasterDataService,
  ) {}

  @Get('vendors')
  @Permissions('Vendor.VIEW')
  listVendors(@Query() query: ListVendorQueryDto) {
    return this.masterData.listVendors(query);
  }

  @Post('vendors')
  @Permissions('Vendor.CREATE')
  createVendor(@Body() dto: CreateVendorDto, @Req() request: { user?: { sub?: string } }) {
    return this.masterData.createVendor(dto, request.user?.sub ?? 'system');
  }

  @Get('fiscal-periods')
  @Permissions('FiscalPeriod.VIEW')
  listFiscalPeriods(@Query() query: ListFiscalPeriodQueryDto) {
    return this.masterData.listFiscalPeriods(query);
  }

  @Post('fiscal-periods')
  @Permissions('FiscalPeriod.CREATE')
  createFiscalPeriod(@Body() dto: CreateFiscalPeriodDto, @Req() request: { user?: { sub?: string } }) {
    return this.masterData.createFiscalPeriod(dto, request.user?.sub ?? 'system');
  }

  @Post('fiscal-periods/:id/status')
  @Permissions('FiscalPeriod.EDIT')
  updateFiscalPeriodStatus(@Param('id') id: string, @Body() dto: UpdateFiscalPeriodStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.masterData.updateFiscalPeriodStatus(id, dto, request.user?.sub ?? 'system');
  }
}
