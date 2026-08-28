import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { ProjectControlsService } from '../../application/services/project-controls.service';
import {
  CreateControlAccountDto, CreateCostCodeDto, CreateForecastDto,
  ListControlAccountQueryDto, ListCostCodeQueryDto,
} from '../dto/project-controls.dto';

@Controller('projects/:projectId')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProjectControlsController {
  constructor(@Inject(ProjectControlsService) private readonly service: ProjectControlsService) {}

  @Get('cost-codes')
  @Permissions(Permission.CostCodeView)
  listCostCodes(@Param('projectId') projectId: string, @Query() query: ListCostCodeQueryDto) {
    return this.service.listCostCodes(projectId, query);
  }

  @Post('cost-codes')
  @Permissions(Permission.CostCodeCreate)
  createCostCode(@Param('projectId') projectId: string, @Body() dto: CreateCostCodeDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createCostCode(projectId, dto, request.user?.sub ?? 'system');
  }

  @Get('control-accounts')
  @Permissions(Permission.ControlAccountView)
  listControlAccounts(@Param('projectId') projectId: string, @Query() query: ListControlAccountQueryDto) {
    return this.service.listControlAccounts(projectId, query);
  }

  @Post('control-accounts')
  @Permissions(Permission.ControlAccountCreate)
  createControlAccount(@Param('projectId') projectId: string, @Body() dto: CreateControlAccountDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createControlAccount(projectId, dto, request.user?.sub ?? 'system');
  }

  @Get('commitment')
  @Permissions(Permission.ProjectView)
  commitment(@Param('projectId') projectId: string) {
    return this.service.commitment(projectId);
  }

  @Get('forecasts')
  @Permissions(Permission.ForecastView)
  listForecasts(@Param('projectId') projectId: string) {
    return this.service.listForecasts(projectId);
  }

  @Post('forecasts')
  @Permissions(Permission.ForecastCreate)
  createForecast(@Param('projectId') projectId: string, @Body() dto: CreateForecastDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createForecast(projectId, dto, request.user?.sub ?? 'system');
  }

  @Get('evm')
  @Permissions(Permission.ProjectView)
  earnedValue(@Param('projectId') projectId: string) {
    return this.service.earnedValue(projectId);
  }
}
