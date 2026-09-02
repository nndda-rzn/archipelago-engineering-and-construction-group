import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import {
  ClosePunchItemDto, CreateInspectionDto, CreateItpDto, CreateNcrDto, CreatePunchItemDto,
  DisposeNcrDto, InspectDto, ListInspectionQueryDto, ListItpQueryDto, ListNcrQueryDto, ListPunchItemQueryDto,
  ReinspectNcrDto,
} from '../dto/quality.dto';
import { ItpService } from '../../application/services/itp.service';
import { InspectionService } from '../../application/services/inspection.service';
import { NcrService } from '../../application/services/ncr.service';
import { PunchListService } from '../../application/services/punch-list.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class QualityController {
  constructor(
    @Inject(ItpService) private readonly itp: ItpService,
    @Inject(InspectionService) private readonly inspection: InspectionService,
    @Inject(NcrService) private readonly ncr: NcrService,
    @Inject(PunchListService) private readonly punchList: PunchListService,
  ) {}

  @Get('quality/itps')
  @Permissions(Permission.QualityView)
  listItps(@Query() query: ListItpQueryDto) {
    return this.itp.listItps(query);
  }

  @Post('quality/itps')
  @Permissions(Permission.QualityCreate)
  createItp(@Body() dto: CreateItpDto, @Req() request: { user?: { sub?: string } }) {
    return this.itp.createItp(dto, request.user?.sub ?? 'system');
  }

  @Get('quality/inspections')
  @Permissions(Permission.QualityView)
  listInspections(@Query() query: ListInspectionQueryDto) {
    return this.inspection.listInspections(query);
  }

  @Post('quality/inspections')
  @Permissions(Permission.QualityCreate)
  createInspection(@Body() dto: CreateInspectionDto, @Req() request: { user?: { sub?: string } }) {
    return this.inspection.createInspection(dto, request.user?.sub ?? 'system');
  }

  @Post('quality/inspections/:id/inspect')
  @Permissions(Permission.QualityInspect)
  inspect(@Param('id') id: string, @Body() dto: InspectDto, @Req() request: { user?: { sub?: string } }) {
    return this.inspection.inspect(id, dto, request.user?.sub ?? 'system');
  }

  @Get('quality/ncrs')
  @Permissions(Permission.QualityView)
  listNcrs(@Query() query: ListNcrQueryDto) {
    return this.ncr.listNcrs(query);
  }

  @Post('quality/ncrs')
  @Permissions(Permission.QualityCreate)
  createNcr(@Body() dto: CreateNcrDto, @Req() request: { user?: { sub?: string } }) {
    return this.ncr.createNcr(dto, request.user?.sub ?? 'system');
  }

  @Post('quality/ncrs/:id/dispose')
  @Permissions(Permission.QualityInspect)
  disposeNcr(@Param('id') id: string, @Body() dto: DisposeNcrDto, @Req() request: { user?: { sub?: string } }) {
    return this.ncr.disposeNcr(id, dto, request.user?.sub ?? 'system');
  }

  @Post('quality/ncrs/:id/reinspect')
  @Permissions(Permission.QualityInspect)
  reinspectNcr(@Param('id') id: string, @Body() dto: ReinspectNcrDto, @Req() request: { user?: { sub?: string } }) {
    return this.ncr.reinspectNcr(id, dto, request.user?.sub ?? 'system');
  }

  @Get('quality/punch-items')
  @Permissions(Permission.QualityView)
  listPunchItems(@Query() query: ListPunchItemQueryDto) {
    return this.punchList.listPunchItems(query);
  }

  @Post('quality/punch-items')
  @Permissions(Permission.QualityCreate)
  createPunchItem(@Body() dto: CreatePunchItemDto, @Req() request: { user?: { sub?: string } }) {
    return this.punchList.createPunchItem(dto, request.user?.sub ?? 'system');
  }

  @Post('quality/punch-items/:id/close')
  @Permissions(Permission.QualityClose)
  closePunchItem(@Param('id') id: string, @Body() dto: ClosePunchItemDto, @Req() request: { user?: { sub?: string } }) {
    return this.punchList.closePunchItem(id, dto, request.user?.sub ?? 'system');
  }
}
