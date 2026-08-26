import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
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
  @Permissions('CostCode.VIEW')
  listCostCodes(@Param('projectId') projectId: string, @Query() query: ListCostCodeQueryDto) {
    return this.service.listCostCodes(projectId, query);
  }

  @Post('cost-codes')
  @Permissions('CostCode.CREATE')
  createCostCode(@Param('projectId') projectId: string, @Body() dto: CreateCostCodeDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createCostCode(projectId, dto, request.user?.sub ?? 'system');
  }

  @Get('control-accounts')
  @Permissions('ControlAccount.VIEW')
  listControlAccounts(@Param('projectId') projectId: string, @Query() query: ListControlAccountQueryDto) {
    return this.service.listControlAccounts(projectId, query);
  }

  @Post('control-accounts')
  @Permissions('ControlAccount.CREATE')
  createControlAccount(@Param('projectId') projectId: string, @Body() dto: CreateControlAccountDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createControlAccount(projectId, dto, request.user?.sub ?? 'system');
  }

  @Get('commitment')
  @Permissions('Project.VIEW')
  commitment(@Param('projectId') projectId: string) {
    return this.service.commitment(projectId);
  }

  @Get('forecasts')
  @Permissions('Forecast.VIEW')
  listForecasts(@Param('projectId') projectId: string) {
    return this.service.listForecasts(projectId);
  }

  @Post('forecasts')
  @Permissions('Forecast.CREATE')
  createForecast(@Param('projectId') projectId: string, @Body() dto: CreateForecastDto, @Req() request: { user?: { sub?: string } }) {
    return this.service.createForecast(projectId, dto, request.user?.sub ?? 'system');
  }

  @Get('evm')
  @Permissions('Project.VIEW')
  earnedValue(@Param('projectId') projectId: string) {
    return this.service.earnedValue(projectId);
  }
}
