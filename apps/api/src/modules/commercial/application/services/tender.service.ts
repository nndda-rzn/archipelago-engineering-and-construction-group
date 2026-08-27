import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateBidDecisionDto, CreateContractAmendmentDto, CreateContractDeviationDto, CreateEstimateDto,
  CreatePricingScenarioDto, CreateTenderSubmissionDto, ListTenderQueryDto,
} from '../../presentation/dto/tender.dto';

@Injectable()
export class TenderService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private async nextNumber(code: string, prefix: string): Promise<string> {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code },
        update: { nextNumber: { increment: 1 } },
        create: { code, prefix, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });
    return seq;
  }

  // ─── FR-COM-002: Bid/No-Bid ─────────────────────────────────────────────────

  async decideBid(opportunityId: string, dto: CreateBidDecisionDto, actorId: string) {
    const opp = await this.prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opp) throw new NotFoundException({ code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity tidak ditemukan' });

    const existing = await this.prisma.bidDecision.findUnique({ where: { opportunityId } });
    if (existing && existing.decision !== 'PENDING') {
      throw new ConflictException({ code: 'BID_ALREADY_DECIDED', message: `Bid decision sudah dibuat (${existing.decision})` });
    }

    const decision = await this.prisma.bidDecision.upsert({
      where: { opportunityId },
      update: { decision: dto.decision, rationale: dto.rationale ?? null, decidedBy: actorId, decidedAt: new Date() },
      create: { opportunityId, decision: dto.decision, rationale: dto.rationale ?? null, decidedBy: actorId },
    });

    await this.audit.record({ userId: actorId, action: 'BidDecision.CREATE', resource: 'BidDecision', resourceId: decision.id, newValue: { oppNumber: opp.oppNumber, decision: dto.decision }, source: 'api' });
    return decision;
  }

  async listBidDecisions(query: ListTenderQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.BidDecisionWhereInput = query.status ? { decision: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.bidDecision.findMany({
        where,
        include: { opportunity: { select: { oppNumber: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bidDecision.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── FR-COM-003: Estimate versioning ────────────────────────────────────────

  async createEstimate(opportunityId: string, dto: CreateEstimateDto, actorId: string) {
    const opp = await this.prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opp) throw new NotFoundException({ code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity tidak ditemukan' });

    const bid = await this.prisma.bidDecision.findUnique({ where: { opportunityId } });
    if (!bid || bid.decision !== 'BID') {
      throw new ConflictException({ code: 'BID_NOT_APPROVED', message: 'Bid/No-Bid harus BID sebelum bid preparation (FR-COM-002)' });
    }

    const last = await this.prisma.estimate.findFirst({ where: { opportunityId }, orderBy: { version: 'desc' } });
    const version = (last?.version ?? 0) + 1;
    const estimateNumber = await this.nextNumber('EST', `EST-${new Date().getFullYear()}-`);

    const estimate = await this.prisma.estimate.create({
      data: {
        estimateNumber,
        opportunityId,
        version,
        description: dto.description ?? null,
        totalAmount: dto.totalAmount,
        createdBy: actorId,
      },
    });

    await this.audit.record({ userId: actorId, action: 'Estimate.CREATE', resource: 'Estimate', resourceId: estimate.id, newValue: { estimateNumber, version, totalAmount: Number(dto.totalAmount) }, source: 'api' });
    return estimate;
  }

  // FR-COM-003: version transition WORKING→REVIEW→APPROVED→FINAL_BID, supersede versi lama
  async transitionEstimate(id: string, status: string, actorId: string) {
    const estimate = await this.prisma.estimate.findUnique({ where: { id } });
    if (!estimate) throw new NotFoundException({ code: 'ESTIMATE_NOT_FOUND', message: 'Estimate tidak ditemukan' });

    const allowed: Record<string, string[]> = {
      WORKING: ['REVIEW'],
      REVIEW: ['APPROVED', 'WORKING'],
      APPROVED: ['FINAL_BID', 'SUPERSEDED'],
      FINAL_BID: ['AWARD_RECONCILED', 'SUPERSEDED'],
      SUPERSEDED: [],
      AWARD_RECONCILED: [],
    };
    if (!(allowed[estimate.status] ?? []).includes(status)) {
      throw new ConflictException({ code: 'INVALID_TRANSITION', message: `Transisi ${estimate.status} → ${status} tidak valid` });
    }

    const updated = await this.prisma.estimate.update({ where: { id }, data: { status } });
    await this.audit.record({ userId: actorId, action: 'Estimate.TRANSITION', resource: 'Estimate', resourceId: id, newValue: { estimateNumber: estimate.estimateNumber, status }, source: 'api' });
    return updated;
  }

  async listEstimates(opportunityId: string) {
    const estimates = await this.prisma.estimate.findMany({
      where: { opportunityId },
      include: { pricingScenarios: true },
      orderBy: { version: 'desc' },
    });
    return { items: estimates, total: estimates.length };
  }

  // ─── FR-COM-004: Pricing scenario ───────────────────────────────────────────

  async createPricingScenario(estimateId: string, dto: CreatePricingScenarioDto, actorId: string) {
    const estimate = await this.prisma.estimate.findUnique({ where: { id: estimateId } });
    if (!estimate) throw new NotFoundException({ code: 'ESTIMATE_NOT_FOUND', message: 'Estimate tidak ditemukan' });

    const exists = await this.prisma.pricingScenario.findUnique({ where: { estimateId_scenarioType: { estimateId, scenarioType: dto.scenarioType } } });
    if (exists) throw new ConflictException({ code: 'SCENARIO_EXISTS', message: `Scenario ${dto.scenarioType} sudah ada di estimate ini` });

    const scenario = await this.prisma.pricingScenario.create({
      data: {
        estimateId,
        scenarioType: dto.scenarioType,
        amount: dto.amount,
        marginPct: dto.marginPct ?? 0,
        note: dto.note ?? null,
      },
    });

    await this.audit.record({ userId: actorId, action: 'PricingScenario.CREATE', resource: 'PricingScenario', resourceId: scenario.id, newValue: { estimateNumber: estimate.estimateNumber, scenarioType: dto.scenarioType, amount: Number(dto.amount) }, source: 'api' });
    return scenario;
  }

  // ─── FR-COM-006: Contract deviation ─────────────────────────────────────────

  async createContractDeviation(opportunityId: string, dto: CreateContractDeviationDto, actorId: string) {
    const opp = await this.prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opp) throw new NotFoundException({ code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity tidak ditemukan' });

    const deviation = await this.prisma.contractDeviation.create({
      data: {
        opportunityId,
        clause: dto.clause,
        clientRequirement: dto.clientRequirement,
        aecPosition: dto.aecPosition,
        risk: dto.risk ?? 'LOW',
        owner: dto.owner,
      },
    });

    await this.audit.record({ userId: actorId, action: 'ContractDeviation.CREATE', resource: 'ContractDeviation', resourceId: deviation.id, newValue: { oppNumber: opp.oppNumber, clause: dto.clause, risk: dto.risk ?? 'LOW' }, source: 'api' });
    return deviation;
  }

  async approveDeviation(id: string, approved: boolean, actorId: string) {
    const deviation = await this.prisma.contractDeviation.findUnique({ where: { id } });
    if (!deviation) throw new NotFoundException({ code: 'DEVIATION_NOT_FOUND', message: 'Deviation tidak ditemukan' });
    if (deviation.status !== 'OPEN') {
      throw new ConflictException({ code: 'NOT_OPEN', message: `Hanya OPEN yang bisa di-approve (${deviation.status})` });
    }
    const updated = await this.prisma.contractDeviation.update({
      where: { id },
      data: { status: approved ? 'APPROVED' : 'REJECTED', approvedBy: actorId, approvedAt: new Date() },
    });
    await this.audit.record({ userId: actorId, action: approved ? 'ContractDeviation.APPROVE' : 'ContractDeviation.REJECT', resource: 'ContractDeviation', resourceId: id, newValue: { status: updated.status }, source: 'api' });
    return updated;
  }

  async listContractDeviations(opportunityId: string) {
    const items = await this.prisma.contractDeviation.findMany({
      where: { opportunityId },
      orderBy: { createdAt: 'desc' },
    });
    return { items, total: items.length };
  }

  // ─── FR-COM-007: Tender submission evidence ─────────────────────────────────

  async createTenderSubmission(dto: CreateTenderSubmissionDto, actorId: string) {
    const opp = await this.prisma.opportunity.findUnique({ where: { id: dto.opportunityId } });
    if (!opp) throw new NotFoundException({ code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity tidak ditemukan' });

    if (dto.estimateId) {
      const estimate = await this.prisma.estimate.findUnique({ where: { id: dto.estimateId } });
      if (!estimate || estimate.opportunityId !== dto.opportunityId) {
        throw new NotFoundException({ code: 'ESTIMATE_NOT_FOUND', message: 'Estimate tidak ditemukan di opportunity ini' });
      }
    }

    const submissionNumber = await this.nextNumber('TSB', `TSB-${new Date().getFullYear()}-`);

    const submission = await this.prisma.tenderSubmission.create({
      data: {
        submissionNumber,
        opportunityId: dto.opportunityId,
        estimateId: dto.estimateId ?? null,
        channel: dto.channel ?? 'ELECTRONIC',
        packageVersion: dto.packageVersion ?? null,
        submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : new Date(),
        submittedBy: actorId,
        acknowledgement: dto.acknowledgement ?? null,
        fileHash: dto.fileHash ?? null,
      },
    });

    await this.audit.record({ userId: actorId, action: 'TenderSubmission.CREATE', resource: 'TenderSubmission', resourceId: submission.id, newValue: { submissionNumber, channel: dto.channel ?? 'ELECTRONIC', packageVersion: dto.packageVersion ?? null }, source: 'api' });
    return submission;
  }

  async listTenderSubmissions(query: ListTenderQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.TenderSubmissionWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tenderSubmission.findMany({
        where,
        include: { opportunity: { select: { oppNumber: true, title: true } }, estimate: { select: { estimateNumber: true, version: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tenderSubmission.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── FR-COM-008: Contract amendment ─────────────────────────────────────────

  async createContractAmendment(contractId: string, dto: CreateContractAmendmentDto, actorId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException({ code: 'CONTRACT_NOT_FOUND', message: 'Kontrak tidak ditemukan' });
    if (contract.status !== 'EXECUTED' && contract.status !== 'AMENDED') {
      throw new ConflictException({ code: 'NOT_EXECUTED', message: 'Amendment hanya untuk kontrak EXECUTED' });
    }

    const amendmentNumber = await this.nextNumber('AMD', `AMD-${new Date().getFullYear()}-`);

    const amendment = await this.prisma.contractAmendment.create({
      data: {
        amendmentNumber,
        contractId,
        title: dto.title,
        description: dto.description ?? null,
        amountChange: dto.amountChange,
        signedDate: dto.signedDate ? new Date(dto.signedDate) : null,
      },
    });

    await this.audit.record({ userId: actorId, action: 'ContractAmendment.CREATE', resource: 'ContractAmendment', resourceId: amendment.id, newValue: { amendmentNumber, contractNumber: contract.contractNumber, amountChange: Number(dto.amountChange) }, source: 'api' });
    return amendment;
  }

  async executeAmendment(id: string, actorId: string) {
    const amendment = await this.prisma.contractAmendment.findUnique({ where: { id }, include: { contract: true } });
    if (!amendment) throw new NotFoundException({ code: 'AMENDMENT_NOT_FOUND', message: 'Amendment tidak ditemukan' });
    if (amendment.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa dieksekusi (${amendment.status})` });
    }

    // Eksekusi: update contract value + status AMENDED, amendment immutable
    const [executed, updatedContract] = await this.prisma.$transaction([
      this.prisma.contractAmendment.update({ where: { id }, data: { status: 'EXECUTED', signedDate: new Date() } }),
      this.prisma.contract.update({
        where: { id: amendment.contractId },
        data: { value: { increment: amendment.amountChange }, status: 'AMENDED' },
      }),
    ]);

    await this.audit.record({ userId: actorId, action: 'ContractAmendment.EXECUTE', resource: 'ContractAmendment', resourceId: id, newValue: { amendmentNumber: amendment.amendmentNumber, amountChange: Number(amendment.amountChange), contractValueAfter: Number(updatedContract.value) }, source: 'api' });
    return { executed, contractValueAfter: Number(updatedContract.value) };
  }

  async listAmendments(contractId: string) {
    const items = await this.prisma.contractAmendment.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
    return { items, total: items.length };
  }
}
