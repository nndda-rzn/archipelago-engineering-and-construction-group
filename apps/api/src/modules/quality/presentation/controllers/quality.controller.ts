import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import {
  ClosePunchItemDto, CreateInspectionDto, CreateItpDto, CreateNcrDto, CreatePunchItemDto,
  DisposeNcrDto, InspectDto, ListInspectionQueryDto, ListItpQueryDto, ListNcrQueryDto, ListPunchItemQueryDto,
  ReinspectNcrDto,
} from '../dto/quality.dto';
import { QualityService } from '../../application/services/quality.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class QualityController {
  constructor(
    @Inject(QualityService) private readonly quality: QualityService,
  ) {}

  @Get('quality/itps')
  @Permissions('Quality.VIEW')
  listItps(@Query() query: ListItpQueryDto) {
    return this.quality.listItps(query);
  }

  @Post('quality/itps')
  @Permissions('Quality.CREATE')
  createItp(@Body() dto: CreateItpDto, @Req() request: { user?: { sub?: string } }) {
    return this.quality.createItp(dto, request.user?.sub ?? 'system');
  }

  @Get('quality/inspections')
  @Permissions('Quality.VIEW')
  listInspections(@Query() query: ListInspectionQueryDto) {
    return this.quality.listInspections(query);
  }

  @Post('quality/inspections')
  @Permissions('Quality.CREATE')
  createInspection(@Body() dto: CreateInspectionDto, @Req() request: { user?: { sub?: string } }) {
    return this.quality.createInspection(dto, request.user?.sub ?? 'system');
  }

  @Post('quality/inspections/:id/inspect')
  @Permissions('Quality.INSPECT')
  inspect(@Param('id') id: string, @Body() dto: InspectDto, @Req() request: { user?: { sub?: string } }) {
    return this.quality.inspect(id, dto, request.user?.sub ?? 'system');
  }

  @Get('quality/ncrs')
  @Permissions('Quality.VIEW')
  listNcrs(@Query() query: ListNcrQueryDto) {
    return this.quality.listNcrs(query);
  }

  @Post('quality/ncrs')
  @Permissions('Quality.CREATE')
  createNcr(@Body() dto: CreateNcrDto, @Req() request: { user?: { sub?: string } }) {
    return this.quality.createNcr(dto, request.user?.sub ?? 'system');
  }

  @Post('quality/ncrs/:id/dispose')
  @Permissions('Quality.INSPECT')
  disposeNcr(@Param('id') id: string, @Body() dto: DisposeNcrDto, @Req() request: { user?: { sub?: string } }) {
    return this.quality.disposeNcr(id, dto, request.user?.sub ?? 'system');
  }

  @Post('quality/ncrs/:id/reinspect')
  @Permissions('Quality.INSPECT')
  reinspectNcr(@Param('id') id: string, @Body() dto: ReinspectNcrDto, @Req() request: { user?: { sub?: string } }) {
    return this.quality.reinspectNcr(id, dto, request.user?.sub ?? 'system');
  }

  @Get('quality/punch-items')
  @Permissions('Quality.VIEW')
  listPunchItems(@Query() query: ListPunchItemQueryDto) {
    return this.quality.listPunchItems(query);
  }

  @Post('quality/punch-items')
  @Permissions('Quality.CREATE')
  createPunchItem(@Body() dto: CreatePunchItemDto, @Req() request: { user?: { sub?: string } }) {
    return this.quality.createPunchItem(dto, request.user?.sub ?? 'system');
  }

  @Post('quality/punch-items/:id/close')
  @Permissions('Quality.CLOSE')
  closePunchItem(@Param('id') id: string, @Body() dto: ClosePunchItemDto, @Req() request: { user?: { sub?: string } }) {
    return this.quality.closePunchItem(id, dto, request.user?.sub ?? 'system');
  }
}
