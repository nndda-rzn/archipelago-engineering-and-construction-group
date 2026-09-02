import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import {
  AnswerRfiDto, CreateDeliverableDto, CreateDrawingDto, CreateRfiDto, CreateSubmittalDto, CreateTransmittalDto,
  ListDeliverableQueryDto, ListDrawingQueryDto, ListRfiQueryDto, ListSubmittalQueryDto, ListTransmittalQueryDto,
  PublishDrawingDto, ReviewSubmittalDto, UpdateDeliverableStatusDto,
} from '../dto/engineering.dto';
import { DeliverableService } from '../../application/services/deliverable.service';
import { DrawingService } from '../../application/services/drawing.service';
import { RfiService } from '../../application/services/rfi.service';
import { SubmittalService } from '../../application/services/submittal.service';
import { TransmittalService } from '../../application/services/transmittal.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class EngineeringController {
  constructor(
    @Inject(DeliverableService) private readonly deliverable: DeliverableService,
    @Inject(DrawingService) private readonly drawing: DrawingService,
    @Inject(RfiService) private readonly rfi: RfiService,
    @Inject(SubmittalService) private readonly submittal: SubmittalService,
    @Inject(TransmittalService) private readonly transmittal: TransmittalService,
  ) {}

  @Get('engineering/deliverables')
  @Permissions(Permission.EngineeringView)
  listDeliverables(@Query() query: ListDeliverableQueryDto) {
    return this.deliverable.listDeliverables(query);
  }

  @Post('engineering/deliverables')
  @Permissions(Permission.EngineeringCreate)
  createDeliverable(@Body() dto: CreateDeliverableDto, @Req() request: { user?: { sub?: string } }) {
    return this.deliverable.createDeliverable(dto, request.user?.sub ?? 'system');
  }

  @Post('engineering/deliverables/:id/status')
  @Permissions(Permission.EngineeringEdit)
  updateDeliverableStatus(@Param('id') id: string, @Body() dto: UpdateDeliverableStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.deliverable.updateDeliverableStatus(id, dto, request.user?.sub ?? 'system');
  }

  @Get('engineering/drawings')
  @Permissions(Permission.EngineeringView)
  listDrawings(@Query() query: ListDrawingQueryDto) {
    return this.drawing.listDrawings(query);
  }

  @Post('engineering/drawings')
  @Permissions(Permission.EngineeringCreate)
  createDrawing(@Body() dto: CreateDrawingDto, @Req() request: { user?: { sub?: string } }) {
    return this.drawing.createDrawing(dto, request.user?.sub ?? 'system');
  }

  @Post('engineering/drawings/:id/publish')
  @Permissions(Permission.EngineeringEdit)
  publishDrawing(@Param('id') id: string, @Body() dto: PublishDrawingDto, @Req() request: { user?: { sub?: string } }) {
    return this.drawing.publishDrawing(id, dto, request.user?.sub ?? 'system');
  }

  @Get('engineering/drawings/ifc')
  @Permissions(Permission.EngineeringView)
  listIfc(@Query('projectId') projectId: string) {
    return this.drawing.listIfc(projectId);
  }

  @Get('engineering/rfis')
  @Permissions(Permission.EngineeringView)
  listRfis(@Query() query: ListRfiQueryDto) {
    return this.rfi.listRfis(query);
  }

  @Post('engineering/rfis')
  @Permissions(Permission.EngineeringCreate)
  createRfi(@Body() dto: CreateRfiDto, @Req() request: { user?: { sub?: string } }) {
    return this.rfi.createRfi(dto, request.user?.sub ?? 'system');
  }

  @Post('engineering/rfis/:id/answer')
  @Permissions(Permission.EngineeringEdit)
  answerRfi(@Param('id') id: string, @Body() dto: AnswerRfiDto, @Req() request: { user?: { sub?: string } }) {
    return this.rfi.answerRfi(id, dto, request.user?.sub ?? 'system');
  }

  @Get('engineering/submittals')
  @Permissions(Permission.EngineeringView)
  listSubmittals(@Query() query: ListSubmittalQueryDto) {
    return this.submittal.listSubmittals(query);
  }

  @Post('engineering/submittals')
  @Permissions(Permission.EngineeringCreate)
  createSubmittal(@Body() dto: CreateSubmittalDto, @Req() request: { user?: { sub?: string } }) {
    return this.submittal.createSubmittal(dto, request.user?.sub ?? 'system');
  }

  @Post('engineering/submittals/:id/review')
  @Permissions(Permission.EngineeringEdit)
  reviewSubmittal(@Param('id') id: string, @Body() dto: ReviewSubmittalDto, @Req() request: { user?: { sub?: string } }) {
    return this.submittal.reviewSubmittal(id, dto, request.user?.sub ?? 'system');
  }

  @Get('engineering/transmittals')
  @Permissions(Permission.EngineeringView)
  listTransmittals(@Query() query: ListTransmittalQueryDto) {
    return this.transmittal.listTransmittals(query);
  }

  @Post('engineering/transmittals')
  @Permissions(Permission.EngineeringCreate)
  createTransmittal(@Body() dto: CreateTransmittalDto, @Req() request: { user?: { sub?: string } }) {
    return this.transmittal.createTransmittal(dto, request.user?.sub ?? 'system');
  }
}
