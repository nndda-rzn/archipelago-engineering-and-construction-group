import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { CostCodeService } from '../../application/services/cost-code.service';
import { ControlAccountService } from '../../application/services/control-account.service';
import { CommitmentService } from '../../application/services/commitment.service';
import { ForecastService } from '../../application/services/forecast.service';
import { EarnedValueService } from '../../application/services/earned-value.service';
import {
  CreateControlAccountDto, CreateCostCodeDto, CreateForecastDto,
  ListControlAccountQueryDto, ListCostCodeQueryDto,
} from '../dto/project-controls.dto';

@Controller('projects/:projectId')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProjectControlsController {
  constructor(
    @Inject(CostCodeService) private readonly costCode: CostCodeService,
    @Inject(ControlAccountService) private readonly controlAccount: ControlAccountService,
    @Inject(CommitmentService) private readonly commitment: CommitmentService,
    @Inject(ForecastService) private readonly forecast: ForecastService,
    @Inject(EarnedValueService) private readonly earnedValue: EarnedValueService,
  ) {}

  @Get('cost-codes')
  @Permissions(Permission.CostCodeView)
  listCostCodes(@Param('projectId') projectId: string, @Query() query: ListCostCodeQueryDto) {
    return this.costCode.listCostCodes(projectId, query);
  }

  @Post('cost-codes')
  @Permissions(Permission.CostCodeCreate)
  createCostCode(@Param('projectId') projectId: string, @Body() dto: CreateCostCodeDto, @Req() request: { user?: { sub?: string } }) {
    return this.costCode.createCostCode(projectId, dto, request.user?.sub ?? 'system');
  }

  @Get('control-accounts')
  @Permissions(Permission.ControlAccountView)
  listControlAccounts(@Param('projectId') projectId: string, @Query() query: ListControlAccountQueryDto) {
    return this.controlAccount.listControlAccounts(projectId, query);
  }

  @Post('control-accounts')
  @Permissions(Permission.ControlAccountCreate)
  createControlAccount(@Param('projectId') projectId: string, @Body() dto: CreateControlAccountDto, @Req() request: { user?: { sub?: string } }) {
    return this.controlAccount.createControlAccount(projectId, dto, request.user?.sub ?? 'system');
  }

  @Get('commitment')
  @Permissions(Permission.ProjectView)
  getCommitment(@Param('projectId') projectId: string) {
    return this.commitment.commitment(projectId);
  }

  @Get('forecasts')
  @Permissions(Permission.ForecastView)
  listForecasts(@Param('projectId') projectId: string) {
    return this.forecast.listForecasts(projectId);
  }

  @Post('forecasts')
  @Permissions(Permission.ForecastCreate)
  createForecast(@Param('projectId') projectId: string, @Body() dto: CreateForecastDto, @Req() request: { user?: { sub?: string } }) {
    return this.forecast.createForecast(projectId, dto, request.user?.sub ?? 'system');
  }

  @Get('evm')
  @Permissions(Permission.ProjectView)
  getEarnedValue(@Param('projectId') projectId: string) {
    return this.earnedValue.earnedValue(projectId);
  }
}
