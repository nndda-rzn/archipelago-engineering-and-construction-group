import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import {
  AnswerRfiDto, CreateDeliverableDto, CreateDrawingDto, CreateRfiDto, CreateSubmittalDto, CreateTransmittalDto,
  ListDeliverableQueryDto, ListDrawingQueryDto, ListRfiQueryDto, ListSubmittalQueryDto, ListTransmittalQueryDto,
  PublishDrawingDto, ReviewSubmittalDto, UpdateDeliverableStatusDto,
} from '../dto/engineering.dto';
import { EngineeringService } from '../../application/services/engineering.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class EngineeringController {
  constructor(
    @Inject(EngineeringService) private readonly engineering: EngineeringService,
  ) {}

  @Get('engineering/deliverables')
  @Permissions('Engineering.VIEW')
  listDeliverables(@Query() query: ListDeliverableQueryDto) {
    return this.engineering.listDeliverables(query);
  }

  @Post('engineering/deliverables')
  @Permissions('Engineering.CREATE')
  createDeliverable(@Body() dto: CreateDeliverableDto, @Req() request: { user?: { sub?: string } }) {
    return this.engineering.createDeliverable(dto, request.user?.sub ?? 'system');
  }

  @Post('engineering/deliverables/:id/status')
  @Permissions('Engineering.EDIT')
  updateDeliverableStatus(@Param('id') id: string, @Body() dto: UpdateDeliverableStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.engineering.updateDeliverableStatus(id, dto, request.user?.sub ?? 'system');
  }

  @Get('engineering/drawings')
  @Permissions('Engineering.VIEW')
  listDrawings(@Query() query: ListDrawingQueryDto) {
    return this.engineering.listDrawings(query);
  }

  @Post('engineering/drawings')
  @Permissions('Engineering.CREATE')
  createDrawing(@Body() dto: CreateDrawingDto, @Req() request: { user?: { sub?: string } }) {
    return this.engineering.createDrawing(dto, request.user?.sub ?? 'system');
  }

  @Post('engineering/drawings/:id/publish')
  @Permissions('Engineering.EDIT')
  publishDrawing(@Param('id') id: string, @Body() dto: PublishDrawingDto, @Req() request: { user?: { sub?: string } }) {
    return this.engineering.publishDrawing(id, dto, request.user?.sub ?? 'system');
  }

  @Get('engineering/drawings/ifc')
  @Permissions('Engineering.VIEW')
  listIfc(@Query('projectId') projectId: string) {
    return this.engineering.listIfc(projectId);
  }

  @Get('engineering/rfis')
  @Permissions('Engineering.VIEW')
  listRfis(@Query() query: ListRfiQueryDto) {
    return this.engineering.listRfis(query);
  }

  @Post('engineering/rfis')
  @Permissions('Engineering.CREATE')
  createRfi(@Body() dto: CreateRfiDto, @Req() request: { user?: { sub?: string } }) {
    return this.engineering.createRfi(dto, request.user?.sub ?? 'system');
  }

  @Post('engineering/rfis/:id/answer')
  @Permissions('Engineering.EDIT')
  answerRfi(@Param('id') id: string, @Body() dto: AnswerRfiDto, @Req() request: { user?: { sub?: string } }) {
    return this.engineering.answerRfi(id, dto, request.user?.sub ?? 'system');
  }

  @Get('engineering/submittals')
  @Permissions('Engineering.VIEW')
  listSubmittals(@Query() query: ListSubmittalQueryDto) {
    return this.engineering.listSubmittals(query);
  }

  @Post('engineering/submittals')
  @Permissions('Engineering.CREATE')
  createSubmittal(@Body() dto: CreateSubmittalDto, @Req() request: { user?: { sub?: string } }) {
    return this.engineering.createSubmittal(dto, request.user?.sub ?? 'system');
  }

  @Post('engineering/submittals/:id/review')
  @Permissions('Engineering.EDIT')
  reviewSubmittal(@Param('id') id: string, @Body() dto: ReviewSubmittalDto, @Req() request: { user?: { sub?: string } }) {
    return this.engineering.reviewSubmittal(id, dto, request.user?.sub ?? 'system');
  }

  @Get('engineering/transmittals')
  @Permissions('Engineering.VIEW')
  listTransmittals(@Query() query: ListTransmittalQueryDto) {
    return this.engineering.listTransmittals(query);
  }

  @Post('engineering/transmittals')
  @Permissions('Engineering.CREATE')
  createTransmittal(@Body() dto: CreateTransmittalDto, @Req() request: { user?: { sub?: string } }) {
    return this.engineering.createTransmittal(dto, request.user?.sub ?? 'system');
  }
}
