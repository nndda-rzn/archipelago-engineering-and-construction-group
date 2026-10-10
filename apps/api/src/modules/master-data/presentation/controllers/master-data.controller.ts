import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import {
  CreateFiscalPeriodDto, CreateVendorDto, ListFiscalPeriodQueryDto, ListNumberSequenceQueryDto,
  ListVendorQueryDto, SetVendorStatusDto, UpdateFiscalPeriodStatusDto, UpdateVendorDto,
} from '../dto/master-data.dto';
import { MasterDataService } from '../../application/services/master-data.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class MasterDataController {
  constructor(
    @Inject(MasterDataService) private readonly masterData: MasterDataService,
  ) {}

  @Get('vendors')
  @Permissions(Permission.MasterDataView, Permission.VendorView)
  listVendors(@Query() query: ListVendorQueryDto) {
    return this.masterData.listVendors(query);
  }

  // Rute statis `stats` harus lebih dulu dari `:id` bila ada.
  @Get('vendors/stats')
  @Permissions(Permission.MasterDataView, Permission.VendorView)
  vendorStats() {
    return this.masterData.vendorStats();
  }

  @Get('vendors/:id')
  @Permissions(Permission.MasterDataView, Permission.VendorView)
  findVendor(@Param('id') id: string) {
    return this.masterData.findVendor(id);
  }

  @Post('vendors')
  @Permissions(Permission.MasterDataView, Permission.VendorCreate)
  createVendor(@Body() dto: CreateVendorDto, @Req() request: { user?: { sub?: string } }) {
    return this.masterData.createVendor(dto, request.user?.sub ?? 'system');
  }

  @Patch('vendors/:id')
  @Permissions(Permission.MasterDataView, Permission.VendorCreate)
  updateVendor(@Param('id') id: string, @Body() dto: UpdateVendorDto, @Req() request: { user?: { sub?: string } }) {
    return this.masterData.updateVendor(id, dto, request.user?.sub ?? 'system');
  }

  @Post('vendors/:id/status')
  @Permissions(Permission.MasterDataView, Permission.VendorCreate)
  setVendorStatus(@Param('id') id: string, @Body() dto: SetVendorStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.masterData.setVendorStatus(id, dto, request.user?.sub ?? 'system');
  }

  @Get('fiscal-periods')
  @Permissions(Permission.MasterDataView, Permission.FiscalPeriodView)
  listFiscalPeriods(@Query() query: ListFiscalPeriodQueryDto) {
    return this.masterData.listFiscalPeriods(query);
  }

  @Post('fiscal-periods')
  @Permissions(Permission.MasterDataView, Permission.FiscalPeriodCreate)
  createFiscalPeriod(@Body() dto: CreateFiscalPeriodDto, @Req() request: { user?: { sub?: string } }) {
    return this.masterData.createFiscalPeriod(dto, request.user?.sub ?? 'system');
  }

  @Post('fiscal-periods/:id/status')
  @Permissions(Permission.MasterDataView, Permission.FiscalPeriodEdit)
  updateFiscalPeriodStatus(@Param('id') id: string, @Body() dto: UpdateFiscalPeriodStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.masterData.updateFiscalPeriodStatus(id, dto, request.user?.sub ?? 'system');
  }

  @Get('number-sequences')
  @Permissions(Permission.MasterDataView)
  listNumberSequences(@Query() query: ListNumberSequenceQueryDto) {
    return this.masterData.listNumberSequences(query);
  }
}
