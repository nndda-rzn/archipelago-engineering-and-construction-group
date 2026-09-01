import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import {
  CloseCorrectiveActionDto, CreateCorrectiveActionDto, CreateIncidentDto, CreateObservationDto,
  CreatePermitDto, InvestigateIncidentDto, ListIncidentQueryDto, ListObservationQueryDto, ListPermitQueryDto,
} from '../dto/hse.dto';
import { SafetyObservationService } from '../../application/services/safety-observation.service';
import { HseIncidentService } from '../../application/services/hse-incident.service';
import { PermitToWorkService } from '../../application/services/permit-to-work.service';
import { CorrectiveActionService } from '../../application/services/corrective-action.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class HseController {
  constructor(
    @Inject(SafetyObservationService) private readonly safetyObservation: SafetyObservationService,
    @Inject(HseIncidentService) private readonly hseIncident: HseIncidentService,
    @Inject(PermitToWorkService) private readonly permitToWork: PermitToWorkService,
    @Inject(CorrectiveActionService) private readonly correctiveAction: CorrectiveActionService,
  ) {}

  // ─── Safety Observation (FR-HSE-001) ─────────────────────────────────────────

  @Get('hse/observations')
  @Permissions(Permission.SafetyObservationView)
  listObservations(@Query() query: ListObservationQueryDto) {
    return this.safetyObservation.listObservations(query);
  }

  @Post('hse/observations')
  @Permissions(Permission.SafetyObservationCreate)
  createObservation(@Body() dto: CreateObservationDto, @Req() request: { user?: { sub?: string } }) {
    return this.safetyObservation.createObservation(dto, request.user?.sub ?? 'system');
  }

  @Post('hse/observations/:id/resolve')
  @Permissions(Permission.SafetyObservationResolve)
  resolveObservation(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.safetyObservation.resolveObservation(id, request.user?.sub ?? 'system');
  }

  // ─── HSE Incident (FR-HSE-002/003) ───────────────────────────────────────────

  @Get('hse/incidents')
  @Permissions(Permission.HseIncidentView)
  listIncidents(@Query() query: ListIncidentQueryDto) {
    return this.hseIncident.listIncidents(query);
  }

  @Post('hse/incidents')
  @Permissions(Permission.HseIncidentCreate)
  createIncident(@Body() dto: CreateIncidentDto, @Req() request: { user?: { sub?: string } }) {
    return this.hseIncident.createIncident(dto, request.user?.sub ?? 'system');
  }

  @Post('hse/incidents/:id/investigate')
  @Permissions(Permission.HseIncidentInvestigate)
  investigateIncident(@Param('id') id: string, @Body() dto: InvestigateIncidentDto, @Req() request: { user?: { sub?: string } }) {
    return this.hseIncident.investigateIncident(id, dto, request.user?.sub ?? 'system');
  }

  @Post('hse/incidents/:id/resolve')
  @Permissions(Permission.HseIncidentResolve)
  resolveIncident(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.hseIncident.resolveIncident(id, request.user?.sub ?? 'system');
  }

  // ─── Permit to Work (FR-HSE-004) ─────────────────────────────────────────────

  @Get('hse/permits')
  @Permissions(Permission.PermitToWorkView)
  listPermits(@Query() query: ListPermitQueryDto) {
    return this.permitToWork.listPermits(query);
  }

  @Post('hse/permits')
  @Permissions(Permission.PermitToWorkCreate)
  createPermit(@Body() dto: CreatePermitDto, @Req() request: { user?: { sub?: string } }) {
    return this.permitToWork.createPermit(dto, request.user?.sub ?? 'system');
  }

  @Post('hse/permits/:id/revoke')
  @Permissions(Permission.PermitToWorkRevoke)
  revokePermit(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.permitToWork.revokePermit(id, request.user?.sub ?? 'system');
  }

  // ─── Corrective Action (FR-HSE-005) ──────────────────────────────────────────

  @Post('hse/corrective-actions')
  @Permissions(Permission.CorrectiveActionCreate)
  createCorrectiveAction(@Body() dto: CreateCorrectiveActionDto, @Req() request: { user?: { sub?: string } }) {
    return this.correctiveAction.createCorrectiveAction(dto, request.user?.sub ?? 'system');
  }

  @Post('hse/corrective-actions/:id/verify')
  @Permissions(Permission.CorrectiveActionVerify)
  closeCorrectiveAction(@Param('id') id: string, @Body() dto: CloseCorrectiveActionDto, @Req() request: { user?: { sub?: string } }) {
    return this.correctiveAction.closeCorrectiveAction(id, dto, request.user?.sub ?? 'system');
  }
}
