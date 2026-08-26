import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
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
  @Permissions('Opportunity.EDIT')
  decideBid(@Param('id') id: string, @Body() dto: CreateBidDecisionDto, @Req() request: { user?: { sub?: string } }) {
    return this.tender.decideBid(id, dto, request.user?.sub ?? 'system');
  }

  @Get('bid-decisions')
  @Permissions('Opportunity.VIEW')
  listBidDecisions(@Query() query: ListTenderQueryDto) {
    return this.tender.listBidDecisions(query);
  }

  @Post('opportunities/:id/estimates')
  @Permissions('Opportunity.EDIT')
  createEstimate(@Param('id') id: string, @Body() dto: CreateEstimateDto, @Req() request: { user?: { sub?: string } }) {
    return this.tender.createEstimate(id, dto, request.user?.sub ?? 'system');
  }

  @Get('opportunities/:id/estimates')
  @Permissions('Opportunity.VIEW')
  listEstimates(@Param('id') id: string) {
    return this.tender.listEstimates(id);
  }

  @Post('estimates/:id/transition')
  @Permissions('Opportunity.EDIT')
  transitionEstimate(@Param('id') id: string, @Body() dto: { status: string }, @Req() request: { user?: { sub?: string } }) {
    return this.tender.transitionEstimate(id, dto.status, request.user?.sub ?? 'system');
  }

  @Post('estimates/:id/pricing-scenarios')
  @Permissions('Opportunity.EDIT')
  createPricingScenario(@Param('id') id: string, @Body() dto: CreatePricingScenarioDto, @Req() request: { user?: { sub?: string } }) {
    return this.tender.createPricingScenario(id, dto, request.user?.sub ?? 'system');
  }

  @Post('opportunities/:id/deviations')
  @Permissions('Opportunity.EDIT')
  createContractDeviation(@Param('id') id: string, @Body() dto: CreateContractDeviationDto, @Req() request: { user?: { sub?: string } }) {
    return this.tender.createContractDeviation(id, dto, request.user?.sub ?? 'system');
  }

  @Get('opportunities/:id/deviations')
  @Permissions('Opportunity.VIEW')
  listContractDeviations(@Param('id') id: string) {
    return this.tender.listContractDeviations(id);
  }

  @Post('deviations/:id/approve')
  @Permissions('Opportunity.EDIT')
  approveDeviation(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.tender.approveDeviation(id, true, request.user?.sub ?? 'system');
  }

  @Post('deviations/:id/reject')
  @Permissions('Opportunity.EDIT')
  rejectDeviation(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.tender.approveDeviation(id, false, request.user?.sub ?? 'system');
  }

  @Post('tender-submissions')
  @Permissions('Opportunity.EDIT')
  createTenderSubmission(@Body() dto: CreateTenderSubmissionDto, @Req() request: { user?: { sub?: string } }) {
    return this.tender.createTenderSubmission(dto, request.user?.sub ?? 'system');
  }

  @Get('tender-submissions')
  @Permissions('Opportunity.VIEW')
  listTenderSubmissions(@Query() query: ListTenderQueryDto) {
    return this.tender.listTenderSubmissions(query);
  }

  @Post('contracts/:id/amendments')
  @Permissions('Contract.EDIT')
  createContractAmendment(@Param('id') id: string, @Body() dto: CreateContractAmendmentDto, @Req() request: { user?: { sub?: string } }) {
    return this.tender.createContractAmendment(id, dto, request.user?.sub ?? 'system');
  }

  @Get('contracts/:id/amendments')
  @Permissions('Contract.VIEW')
  listAmendments(@Param('id') id: string) {
    return this.tender.listAmendments(id);
  }

  @Post('amendments/:id/execute')
  @Permissions('Contract.EXECUTE')
  executeAmendment(@Param('id') id: string, @Req() request: { user?: { sub?: string } }) {
    return this.tender.executeAmendment(id, request.user?.sub ?? 'system');
  }
}
