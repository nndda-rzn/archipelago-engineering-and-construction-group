import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import {
  AdvanceAuditDto, CompleteAccessReviewDto, CreateAccessReviewDto, CreateAuditDto, CreateFindingDto,
  CreateLegalCaseDto, CreateRiskDto, LegalCaseStatusDto, ListAccessReviewQueryDto, ListAuditQueryDto,
  ListLegalCaseQueryDto, ListRiskQueryDto, MitigateRiskDto, RespondFindingDto,
} from '../dto/governance.dto';
import { GovernanceService } from '../../application/services/governance.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class GovernanceController {
  constructor(
    @Inject(GovernanceService) private readonly governance: GovernanceService,
  ) {}

  @Get('governance/risks')
  @Permissions('Risk.VIEW')
  listRisks(@Query() query: ListRiskQueryDto) {
    return this.governance.listRisks(query);
  }

  @Post('governance/risks')
  @Permissions('Risk.CREATE')
  createRisk(@Body() dto: CreateRiskDto, @Req() request: { user?: { sub?: string } }) {
    return this.governance.createRisk(dto, request.user?.sub ?? 'system');
  }

  @Post('governance/risks/:id/mitigate')
  @Permissions('Risk.EDIT')
  mitigateRisk(@Param('id') id: string, @Body() dto: MitigateRiskDto, @Req() request: { user?: { sub?: string } }) {
    return this.governance.mitigateRisk(id, dto, request.user?.sub ?? 'system');
  }

  @Get('governance/audits')
  @Permissions('Audit.VIEW')
  listAudits(@Query() query: ListAuditQueryDto) {
    return this.governance.listAudits(query);
  }

  @Post('governance/audits')
  @Permissions('Audit.CREATE')
  createAudit(@Body() dto: CreateAuditDto, @Req() request: { user?: { sub?: string } }) {
    return this.governance.createAudit(dto, request.user?.sub ?? 'system');
  }

  @Post('governance/audits/:id/status')
  @Permissions('Audit.EDIT')
  advanceAudit(@Param('id') id: string, @Body() dto: AdvanceAuditDto, @Req() request: { user?: { sub?: string } }) {
    return this.governance.advanceAudit(id, dto, request.user?.sub ?? 'system');
  }

  @Post('governance/audits/:id/findings')
  @Permissions('Audit.CREATE')
  createFinding(@Param('id') id: string, @Body() dto: CreateFindingDto, @Req() request: { user?: { sub?: string } }) {
    return this.governance.createFinding(id, dto, request.user?.sub ?? 'system');
  }

  @Post('governance/findings/:id/respond')
  @Permissions('Audit.EDIT')
  respondFinding(@Param('id') id: string, @Body() dto: RespondFindingDto, @Req() request: { user?: { sub?: string } }) {
    return this.governance.respondFinding(id, dto, request.user?.sub ?? 'system');
  }

  @Get('governance/legal-cases')
  @Permissions('LegalCase.VIEW')
  listLegalCases(@Query() query: ListLegalCaseQueryDto) {
    return this.governance.listLegalCases(query);
  }

  @Post('governance/legal-cases')
  @Permissions('LegalCase.CREATE')
  createLegalCase(@Body() dto: CreateLegalCaseDto, @Req() request: { user?: { sub?: string } }) {
    return this.governance.createLegalCase(dto, request.user?.sub ?? 'system');
  }

  @Post('governance/legal-cases/:id/status')
  @Permissions('LegalCase.EDIT')
  updateLegalCaseStatus(@Param('id') id: string, @Body() dto: LegalCaseStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.governance.updateLegalCaseStatus(id, dto, request.user?.sub ?? 'system');
  }

  @Get('governance/access-reviews')
  @Permissions('AccessReview.VIEW')
  listAccessReviews(@Query() query: ListAccessReviewQueryDto) {
    return this.governance.listAccessReviews(query);
  }

  @Post('governance/access-reviews')
  @Permissions('AccessReview.CREATE')
  createAccessReview(@Body() dto: CreateAccessReviewDto, @Req() request: { user?: { sub?: string } }) {
    return this.governance.createAccessReview(dto, request.user?.sub ?? 'system');
  }

  @Post('governance/access-reviews/:id/complete')
  @Permissions('AccessReview.EDIT')
  completeAccessReview(@Param('id') id: string, @Body() dto: CompleteAccessReviewDto, @Req() request: { user?: { sub?: string } }) {
    return this.governance.completeAccessReview(id, dto, request.user?.sub ?? 'system');
  }
}
