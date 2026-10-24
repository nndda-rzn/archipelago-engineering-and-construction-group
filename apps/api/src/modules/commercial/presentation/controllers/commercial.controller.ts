import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import {
  CreateClientDto, ListClientQueryDto, CreateContractDto, CreateOpportunityDto, ExecuteContractDto,
  ListContractQueryDto, ListOpportunityQueryDto, UpdateOpportunityStageDto,
} from '../dto/commercial.dto';
import { CommercialService } from '../../application/services/commercial.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class CommercialController {
  constructor(
    @Inject(CommercialService) private readonly commercial: CommercialService,
  ) {}

  @Get('commercial/summary')
  @Permissions(Permission.OpportunityView)
  getSummary() {
    return this.commercial.getSummary();
  }

  @Get('clients')
  @Permissions(Permission.ClientView)
  listClients(@Query() query: ListClientQueryDto) {
    return this.commercial.listClients(query);
  }

  @Post('clients')
  @Permissions(Permission.ClientCreate)
  createClient(@Body() dto: CreateClientDto, @Req() request: { user?: { sub?: string } }) {
    return this.commercial.createClient(dto, request.user?.sub ?? 'system');
  }

  @Get('opportunities')
  @Permissions(Permission.OpportunityView)
  listOpportunities(@Query() query: ListOpportunityQueryDto) {
    return this.commercial.listOpportunities(query);
  }

  @Post('opportunities')
  @Permissions(Permission.OpportunityCreate)
  createOpportunity(@Body() dto: CreateOpportunityDto, @Req() request: { user?: { sub?: string } }) {
    return this.commercial.createOpportunity(dto, request.user?.sub ?? 'system');
  }

  @Post('opportunities/:id/stage')
  @Permissions(Permission.OpportunityEdit)
  updateOpportunityStage(@Param('id') id: string, @Body() dto: UpdateOpportunityStageDto, @Req() request: { user?: { sub?: string } }) {
    return this.commercial.updateOpportunityStage(id, dto, request.user?.sub ?? 'system');
  }

  @Get('contracts')
  @Permissions(Permission.ContractView)
  listContracts(@Query() query: ListContractQueryDto) {
    return this.commercial.listContracts(query);
  }

  @Post('contracts')
  @Permissions(Permission.ContractCreate)
  createContract(@Body() dto: CreateContractDto, @Req() request: { user?: { sub?: string } }) {
    return this.commercial.createContract(dto, request.user?.sub ?? 'system');
  }

  @Post('contracts/:id/execute')
  @Permissions(Permission.ContractExecute)
  executeContract(@Param('id') id: string, @Body() dto: ExecuteContractDto, @Req() request: { user?: { sub?: string } }) {
    return this.commercial.executeContract(id, dto, request.user?.sub ?? 'system');
  }
}
