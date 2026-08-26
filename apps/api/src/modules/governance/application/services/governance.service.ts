import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateRiskDto, MitigateRiskDto, ListRiskQueryDto,
  CreateAuditDto, ListAuditQueryDto, CreateFindingDto, RespondFindingDto,
  CreateLegalCaseDto, ListLegalCaseQueryDto,
  CreateAccessReviewDto, CompleteAccessReviewDto, ListAccessReviewQueryDto,
} from '../../presentation/dto/governance.dto';

@Injectable()
export class GovernanceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // FR-GOV-001: risk register — score otomatis likelihood x impact
  async createRisk(dto: CreateRiskDto, actorId: string) {
    const score = Number(dto.likelihood) * Number(dto.impact);
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'RSK' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'RSK', prefix: `RSK-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const risk = await this.prisma.risk.create({
      data: {
        riskNumber: seq,
        projectId: dto.projectId ?? null,
        title: dto.title,
        category: dto.category ?? 'TECHNICAL',
        likelihood: Number(dto.likelihood),
        impact: Number(dto.impact),
        score,
        owner: dto.owner,
        mitigation: dto.mitigation ?? null,
      },
      include: { project: { select: { code: true, name: true } } },
    });

    await this.audit.record({ userId: actorId, action: 'Risk.CREATE', resource: 'Risk', resourceId: risk.id, newValue: { riskNumber: seq, score, category: risk.category }, source: 'api' });
    return risk;
  }

  async mitigateRisk(id: string, dto: MitigateRiskDto, actorId: string) {
    const risk = await this.prisma.risk.findUnique({ where: { id } });
    if (!risk) throw new NotFoundException({ code: 'RISK_NOT_FOUND', message: 'Risk tidak ditemukan' });
    if (risk.status === 'CLOSED') {
      throw new ConflictException({ code: 'ALREADY_CLOSED', message: 'Risk sudah closed' });
    }
    const residualScore = dto.residualLikelihood != null && dto.residualImpact != null
      ? Number(dto.residualLikelihood) * Number(dto.residualImpact)
      : null;
    const updated = await this.prisma.risk.update({
      where: { id },
      data: {
        mitigation: dto.mitigation ?? risk.mitigation,
        residualLikelihood: dto.residualLikelihood ?? risk.residualLikelihood,
        residualImpact: dto.residualImpact ?? risk.residualImpact,
        residualScore,
        status: 'MITIGATED',
      },
    });
    await this.audit.record({ userId: actorId, action: 'Risk.MITIGATE', resource: 'Risk', resourceId: id, newValue: { riskNumber: risk.riskNumber, residualScore }, source: 'api' });
    return updated;
  }

  async listRisks(query: ListRiskQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.RiskWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.risk.findMany({ where, include: { project: { select: { code: true } } }, orderBy: { score: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.risk.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-GOV-002: audit engagement + finding lifecycle
  async createAudit(dto: CreateAuditDto, actorId: string) {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'AUD' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'AUD', prefix: `AUD-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const audit = await this.prisma.auditEngagement.create({
      data: { auditNumber: seq, title: dto.title, scope: dto.scope ?? null, plannedAt: new Date(), auditor: actorId },
    });

    await this.audit.record({ userId: actorId, action: 'AuditEngagement.CREATE', resource: 'AuditEngagement', resourceId: audit.id, newValue: { auditNumber: seq, title: dto.title }, source: 'api' });
    return audit;
  }

  async advanceAudit(id: string, dto: { status?: string }, actorId: string) {
    const audit = await this.prisma.auditEngagement.findUnique({ where: { id } });
    if (!audit) throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit tidak ditemukan' });
    const status = dto.status ?? 'FIELDWORK';
    if (!['PLANNED', 'FIELDWORK', 'FINDINGS', 'CLOSED'].includes(status)) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Status audit tidak valid' });
    }
    const updated = await this.prisma.auditEngagement.update({
      where: { id },
      data: { status, completedAt: status === 'CLOSED' ? new Date() : null },
    });
    await this.audit.record({ userId: actorId, action: 'AuditEngagement.STATUS', resource: 'AuditEngagement', resourceId: id, newValue: { auditNumber: audit.auditNumber, status }, source: 'api' });
    return updated;
  }

  async createFinding(auditId: string, dto: CreateFindingDto, actorId: string) {
    const audit = await this.prisma.auditEngagement.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit tidak ditemukan' });
    const finding = await this.prisma.auditFinding.create({
      data: {
        auditId,
        title: dto.title,
        severity: dto.severity ?? 'MEDIUM',
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
      },
    });
    await this.audit.record({ userId: actorId, action: 'AuditFinding.CREATE', resource: 'AuditFinding', resourceId: finding.id, newValue: { auditId, title: dto.title }, source: 'api' });
    return finding;
  }

  async respondFinding(findingId: string, dto: RespondFindingDto, actorId: string) {
    const finding = await this.prisma.auditFinding.findUnique({ where: { id: findingId } });
    if (!finding) throw new NotFoundException({ code: 'FINDING_NOT_FOUND', message: 'Finding tidak ditemukan' });
    if (finding.status === 'VERIFIED') {
      throw new ConflictException({ code: 'ALREADY_VERIFIED', message: 'Finding sudah verified' });
    }
    const status = dto.status === 'VERIFIED' ? 'VERIFIED' : dto.response ? 'ACCEPTED' : finding.status;
    const updated = await this.prisma.auditFinding.update({
      where: { id: findingId },
      data: {
        response: dto.response ?? finding.response,
        correctiveAction: dto.correctiveAction ?? finding.correctiveAction,
        status,
      },
    });
    await this.audit.record({ userId: actorId, action: 'AuditFinding.RESPOND', resource: 'AuditFinding', resourceId: findingId, newValue: { status }, source: 'api' });
    return updated;
  }

  async listAudits(query: ListAuditQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.AuditEngagementWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditEngagement.findMany({
        where,
        include: { findings: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditEngagement.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-GOV-003: legal case
  async createLegalCase(dto: CreateLegalCaseDto, actorId: string) {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'LGL' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'LGL', prefix: `LGL-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const legalCase = await this.prisma.legalCase.create({
      data: {
        caseNumber: seq,
        projectId: dto.projectId ?? null,
        legalEntityId: dto.legalEntityId ?? null,
        title: dto.title,
        caseType: dto.caseType ?? 'CONTRACT',
        counterpart: dto.counterpart ?? null,
        description: dto.description ?? null,
      },
      include: { project: { select: { code: true } } },
    });

    await this.audit.record({ userId: actorId, action: 'LegalCase.CREATE', resource: 'LegalCase', resourceId: legalCase.id, newValue: { caseNumber: seq, title: dto.title, caseType: legalCase.caseType }, source: 'api' });
    return legalCase;
  }

  async updateLegalCaseStatus(id: string, dto: { status?: string }, actorId: string) {
    const legalCase = await this.prisma.legalCase.findUnique({ where: { id } });
    if (!legalCase) throw new NotFoundException({ code: 'LEGAL_CASE_NOT_FOUND', message: 'Legal case tidak ditemukan' });
    const status = dto.status ?? legalCase.status;
    if (!['OPEN', 'IN_PROGRESS', 'WON', 'LOST', 'SETTLED'].includes(status)) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Status legal case tidak valid' });
    }
    const updated = await this.prisma.legalCase.update({ where: { id }, data: { status } });
    await this.audit.record({ userId: actorId, action: 'LegalCase.STATUS', resource: 'LegalCase', resourceId: id, newValue: { caseNumber: legalCase.caseNumber, status }, source: 'api' });
    return updated;
  }

  async listLegalCases(query: ListLegalCaseQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.LegalCaseWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.legalCase.findMany({ where, include: { project: { select: { code: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.legalCase.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-GOV-004: access review berkala
  async createAccessReview(dto: CreateAccessReviewDto, actorId: string) {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'ACR' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'ACR', prefix: `ACR-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const review = await this.prisma.accessReview.create({
      data: { reviewNumber: seq, period: dto.period },
    });

    await this.audit.record({ userId: actorId, action: 'AccessReview.CREATE', resource: 'AccessReview', resourceId: review.id, newValue: { reviewNumber: seq, period: dto.period }, source: 'api' });
    return review;
  }

  async completeAccessReview(id: string, dto: CompleteAccessReviewDto, actorId: string) {
    const review = await this.prisma.accessReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException({ code: 'REVIEW_NOT_FOUND', message: 'Access review tidak ditemukan' });
    if (review.status === 'COMPLETED') {
      throw new ConflictException({ code: 'ALREADY_COMPLETED', message: 'Access review sudah completed' });
    }
    const updated = await this.prisma.accessReview.update({
      where: { id },
      data: { status: 'COMPLETED', notes: dto.notes ?? review.notes, reviewedBy: actorId, reviewedAt: new Date() },
    });
    await this.audit.record({ userId: actorId, action: 'AccessReview.COMPLETE', resource: 'AccessReview', resourceId: id, newValue: { reviewNumber: review.reviewNumber }, source: 'api' });
    return updated;
  }

  async listAccessReviews(query: ListAccessReviewQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.AccessReviewWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.accessReview.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.accessReview.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
