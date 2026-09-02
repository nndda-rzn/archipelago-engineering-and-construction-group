import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { Permissions } from '@/shared/decorators/permissions.decorator';
import { PermissionsGuard } from '@/shared/guards/permissions.guard';
import { Permission } from '@/shared/permissions/permissions';
import {
  AdvanceAuditDto, CompleteAccessReviewDto, CreateAccessReviewDto, CreateAuditDto, CreateFindingDto,
  CreateLegalCaseDto, CreateRiskDto, LegalCaseStatusDto, ListAccessReviewQueryDto, ListAuditQueryDto,
  ListLegalCaseQueryDto, ListRiskQueryDto, MitigateRiskDto, RespondFindingDto,
} from '../dto/governance.dto';
import { RiskService } from '../../application/services/risk.service';
import { AuditEngagementService } from '../../application/services/audit-engagement.service';
import { LegalCaseService } from '../../application/services/legal-case.service';
import { AccessReviewService } from '../../application/services/access-review.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class GovernanceController {
  constructor(
    @Inject(RiskService) private readonly risk: RiskService,
    @Inject(AuditEngagementService) private readonly auditEngagement: AuditEngagementService,
    @Inject(LegalCaseService) private readonly legalCase: LegalCaseService,
    @Inject(AccessReviewService) private readonly accessReview: AccessReviewService,
  ) {}

  @Get('governance/risks')
  @Permissions(Permission.RiskView)
  listRisks(@Query() query: ListRiskQueryDto) {
    return this.risk.listRisks(query);
  }

  @Post('governance/risks')
  @Permissions(Permission.RiskCreate)
  createRisk(@Body() dto: CreateRiskDto, @Req() request: { user?: { sub?: string } }) {
    return this.risk.createRisk(dto, request.user?.sub ?? 'system');
  }

  @Post('governance/risks/:id/mitigate')
  @Permissions(Permission.RiskEdit)
  mitigateRisk(@Param('id') id: string, @Body() dto: MitigateRiskDto, @Req() request: { user?: { sub?: string } }) {
    return this.risk.mitigateRisk(id, dto, request.user?.sub ?? 'system');
  }

  @Get('governance/audits')
  @Permissions(Permission.AuditView)
  listAudits(@Query() query: ListAuditQueryDto) {
    return this.auditEngagement.listAudits(query);
  }

  @Post('governance/audits')
  @Permissions(Permission.AuditCreate)
  createAudit(@Body() dto: CreateAuditDto, @Req() request: { user?: { sub?: string } }) {
    return this.auditEngagement.createAudit(dto, request.user?.sub ?? 'system');
  }

  @Post('governance/audits/:id/status')
  @Permissions(Permission.AuditEdit)
  advanceAudit(@Param('id') id: string, @Body() dto: AdvanceAuditDto, @Req() request: { user?: { sub?: string } }) {
    return this.auditEngagement.advanceAudit(id, dto, request.user?.sub ?? 'system');
  }

  @Post('governance/audits/:id/findings')
  @Permissions(Permission.AuditCreate)
  createFinding(@Param('id') id: string, @Body() dto: CreateFindingDto, @Req() request: { user?: { sub?: string } }) {
    return this.auditEngagement.createFinding(id, dto, request.user?.sub ?? 'system');
  }

  @Post('governance/findings/:id/respond')
  @Permissions(Permission.AuditEdit)
  respondFinding(@Param('id') id: string, @Body() dto: RespondFindingDto, @Req() request: { user?: { sub?: string } }) {
    return this.auditEngagement.respondFinding(id, dto, request.user?.sub ?? 'system');
  }

  @Get('governance/legal-cases')
  @Permissions(Permission.LegalCaseView)
  listLegalCases(@Query() query: ListLegalCaseQueryDto) {
    return this.legalCase.listLegalCases(query);
  }

  @Post('governance/legal-cases')
  @Permissions(Permission.LegalCaseCreate)
  createLegalCase(@Body() dto: CreateLegalCaseDto, @Req() request: { user?: { sub?: string } }) {
    return this.legalCase.createLegalCase(dto, request.user?.sub ?? 'system');
  }

  @Post('governance/legal-cases/:id/status')
  @Permissions(Permission.LegalCaseEdit)
  updateLegalCaseStatus(@Param('id') id: string, @Body() dto: LegalCaseStatusDto, @Req() request: { user?: { sub?: string } }) {
    return this.legalCase.updateLegalCaseStatus(id, dto, request.user?.sub ?? 'system');
  }

  @Get('governance/access-reviews')
  @Permissions(Permission.AccessReviewView)
  listAccessReviews(@Query() query: ListAccessReviewQueryDto) {
    return this.accessReview.listAccessReviews(query);
  }

  @Post('governance/access-reviews')
  @Permissions(Permission.AccessReviewCreate)
  createAccessReview(@Body() dto: CreateAccessReviewDto, @Req() request: { user?: { sub?: string } }) {
    return this.accessReview.createAccessReview(dto, request.user?.sub ?? 'system');
  }

  @Post('governance/access-reviews/:id/complete')
  @Permissions(Permission.AccessReviewEdit)
  completeAccessReview(@Param('id') id: string, @Body() dto: CompleteAccessReviewDto, @Req() request: { user?: { sub?: string } }) {
    return this.accessReview.completeAccessReview(id, dto, request.user?.sub ?? 'system');
  }
}
