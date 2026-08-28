import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import {
  CloseCorrectiveActionDto, CreateCorrectiveActionDto, CreateIncidentDto, CreateObservationDto,
  CreatePermitDto, InvestigateIncidentDto, ListIncidentQueryDto, ListObservationQueryDto, ListPermitQueryDto,
} from '../dto/hse.dto';
import { HseService } from '../../application/services/hse.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class HseController {
  constructor(
    @Inject(HseService) private readonly hse: HseService,
  ) {}

  @Get('hse/observations')
  @Permissions(Permission.SafetyObservationView)
  listObservations(@Query() query: ListObservationQueryDto) {
    return this.hse.listObservations(query);
  }

  @Post('hse/observations')
  @Permissions(Permission.SafetyObservationCreate)
  createObservation(@Body() dto: CreateObservationDto, @Req() request: { user?: { sub?: string } }) {
    return this.hse.createObservation(dto, request.user?.sub ?? 'system');
  }

  @Post('hse/observations/:id/resolve')
  @Permissions(Permission.SafetyObservationResolve)
  resolveObservation(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.hse.resolveObservation(id, request.user?.sub ?? 'system');
  }

  @Get('hse/incidents')
  @Permissions(Permission.HseIncidentView)
  listIncidents(@Query() query: ListIncidentQueryDto) {
    return this.hse.listIncidents(query);
  }

  @Post('hse/incidents')
  @Permissions(Permission.HseIncidentCreate)
  createIncident(@Body() dto: CreateIncidentDto, @Req() request: { user?: { sub?: string } }) {
    return this.hse.createIncident(dto, request.user?.sub ?? 'system');
  }

  @Post('hse/incidents/:id/investigate')
  @Permissions(Permission.HseIncidentInvestigate)
  investigateIncident(@Param('id') id: string, @Body() dto: InvestigateIncidentDto, @Req() request: { user?: { sub?: string } }) {
    return this.hse.investigateIncident(id, dto, request.user?.sub ?? 'system');
  }

  @Post('hse/incidents/:id/resolve')
  @Permissions(Permission.HseIncidentResolve)
  resolveIncident(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.hse.resolveIncident(id, request.user?.sub ?? 'system');
  }

  @Get('hse/permits')
  @Permissions(Permission.PermitToWorkView)
  listPermits(@Query() query: ListPermitQueryDto) {
    return this.hse.listPermits(query);
  }

  @Post('hse/permits')
  @Permissions(Permission.PermitToWorkCreate)
  createPermit(@Body() dto: CreatePermitDto, @Req() request: { user?: { sub?: string } }) {
    return this.hse.createPermit(dto, request.user?.sub ?? 'system');
  }

  @Post('hse/permits/:id/revoke')
  @Permissions(Permission.PermitToWorkRevoke)
  revokePermit(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.hse.revokePermit(id, request.user?.sub ?? 'system');
  }

  @Post('hse/corrective-actions')
  @Permissions(Permission.CorrectiveActionCreate)
  createCorrectiveAction(@Body() dto: CreateCorrectiveActionDto, @Req() request: { user?: { sub?: string } }) {
    return this.hse.createCorrectiveAction(dto, request.user?.sub ?? 'system');
  }

  @Post('hse/corrective-actions/:id/verify')
  @Permissions(Permission.CorrectiveActionVerify)
  closeCorrectiveAction(@Param('id') id: string, @Body() dto: CloseCorrectiveActionDto, @Req() request: { user?: { sub?: string } }) {
    return this.hse.closeCorrectiveAction(id, dto, request.user?.sub ?? 'system');
  }
}
