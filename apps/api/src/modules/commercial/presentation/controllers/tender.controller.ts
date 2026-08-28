import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import { TenderService } from '../../application/services/tender.service';
import {
  CreateBidDecisionDto, CreateContractAmendmentDto, CreateContractDeviationDto, CreateEstimateDto,
  CreatePricingScenarioDto, CreateTenderSubmissionDto, ListTenderQueryDto,
} from '../dto/tender.dto';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class TenderController {
  constructor(@Inject(TenderService) private readonly tender: TenderService) {}

  @Post('opportunities/:id/bid-decision')
  @Permissions(Permission.OpportunityEdit)
  decideBid(@Param('id') id: string, @Body() dto: CreateBidDecisionDto, @Req() request: { user?: { sub?: string } }) {
    return this.tender.decideBid(id, dto, request.user?.sub ?? 'system');
  }

  @Get('bid-decisions')
  @Permissions(Permission.OpportunityView)
  listBidDecisions(@Query() query: ListTenderQueryDto) {
    return this.tender.listBidDecisions(query);
  }

  @Post('opportunities/:id/estimates')
  @Permissions(Permission.OpportunityEdit)
  createEstimate(@Param('id') id: string, @Body() dto: CreateEstimateDto, @Req() request: { user?: { sub?: string } }) {
    return this.tender.createEstimate(id, dto, request.user?.sub ?? 'system');
  }

  @Get('opportunities/:id/estimates')
  @Permissions(Permission.OpportunityView)
  listEstimates(@Param('id') id: string) {
    return this.tender.listEstimates(id);
  }

  @Post('estimates/:id/transition')
  @Permissions(Permission.OpportunityEdit)
  transitionEstimate(@Param('id') id: string, @Body() dto: { status: string }, @Req() request: { user?: { sub?: string } }) {
    return this.tender.transitionEstimate(id, dto.status, request.user?.sub ?? 'system');
  }

  @Post('estimates/:id/pricing-scenarios')
  @Permissions(Permission.OpportunityEdit)
  createPricingScenario(@Param('id') id: string, @Body() dto: CreatePricingScenarioDto, @Req() request: { user?: { sub?: string } }) {
    return this.tender.createPricingScenario(id, dto, request.user?.sub ?? 'system');
  }

  @Post('opportunities/:id/deviations')
  @Permissions(Permission.OpportunityEdit)
  createContractDeviation(@Param('id') id: string, @Body() dto: CreateContractDeviationDto, @Req() request: { user?: { sub?: string } }) {
    return this.tender.createContractDeviation(id, dto, request.user?.sub ?? 'system');
  }

  @Get('opportunities/:id/deviations')
  @Permissions(Permission.OpportunityView)
  listContractDeviations(@Param('id') id: string) {
    return this.tender.listContractDeviations(id);
  }

  @Post('deviations/:id/approve')
  @Permissions(Permission.OpportunityEdit)
  approveDeviation(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.tender.approveDeviation(id, true, request.user?.sub ?? 'system');
  }

  @Post('deviations/:id/reject')
  @Permissions(Permission.OpportunityEdit)
  rejectDeviation(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.tender.approveDeviation(id, false, request.user?.sub ?? 'system');
  }

  @Post('tender-submissions')
  @Permissions(Permission.OpportunityEdit)
  createTenderSubmission(@Body() dto: CreateTenderSubmissionDto, @Req() request: { user?: { sub?: string } }) {
    return this.tender.createTenderSubmission(dto, request.user?.sub ?? 'system');
  }

  @Get('tender-submissions')
  @Permissions(Permission.OpportunityView)
  listTenderSubmissions(@Query() query: ListTenderQueryDto) {
    return this.tender.listTenderSubmissions(query);
  }

  @Post('contracts/:id/amendments')
  @Permissions(Permission.ContractEdit)
  createContractAmendment(@Param('id') id: string, @Body() dto: CreateContractAmendmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.tender.createContractAmendment(id, dto, request.user?.sub ?? 'system');
  }

  @Get('contracts/:id/amendments')
  @Permissions(Permission.ContractView)
  listAmendments(@Param('id') id: string) {
    return this.tender.listAmendments(id);
  }

  @Post('amendments/:id/execute')
  @Permissions(Permission.ContractExecute)
  executeAmendment(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.tender.executeAmendment(id, request.user?.sub ?? 'system');
  }
}
