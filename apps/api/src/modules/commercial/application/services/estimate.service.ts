import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateEstimateDto, CreatePricingScenarioDto } from '../../presentation/dto/tender.dto';

@Injectable()
export class EstimateService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createEstimate(opportunityId: string, dto: CreateEstimateDto, actorId: string) {
    const opp = await this.prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opp) throw new NotFoundException({ code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' });

    const bid = await this.prisma.bidDecision.findUnique({ where: { opportunityId } });
    if (!bid || bid.decision !== 'BID') {
      throw new ConflictException({ code: 'BID_NOT_APPROVED', message: 'Bid/No-Bid must be BID before bid preparation' });
    }

    const last = await this.prisma.estimate.findFirst({ where: { opportunityId }, orderBy: { version: 'desc' } });
    const version = (last?.version ?? 0) + 1;

    const estimate = await this.prisma.$transaction(async (tx) => {
      const estimateNumber = await this.seq.next('EST', `EST-${new Date().getFullYear()}-`, tx);
      return tx.estimate.create({
        data: { estimateNumber, opportunityId, version, description: dto.description ?? null, totalAmount: dto.totalAmount, createdBy: actorId },
      });
    });

    await this.audit.record({ userId: actorId, action: 'Estimate.CREATE', resource: 'Estimate', resourceId: estimate.id, newValue: { estimateNumber: estimate.estimateNumber, version, totalAmount: Number(dto.totalAmount) }, source: 'api' });
    return estimate;
  }

  async transitionEstimate(id: string, status: string, actorId: string) {
    const estimate = await this.prisma.estimate.findUnique({ where: { id } });
    if (!estimate) throw new NotFoundException({ code: 'ESTIMATE_NOT_FOUND', message: 'Estimate not found' });

    const allowed: Record<string, string[]> = {
      WORKING: ['REVIEW'],
      REVIEW: ['APPROVED', 'WORKING'],
      APPROVED: ['FINAL_BID', 'SUPERSEDED'],
      FINAL_BID: ['AWARD_RECONCILED', 'SUPERSEDED'],
      SUPERSEDED: [],
      AWARD_RECONCILED: [],
    };
    if (!(allowed[estimate.status] ?? []).includes(status)) {
      throw new ConflictException({ code: 'INVALID_TRANSITION', message: `Transition ${estimate.status} → ${status} is not valid` });
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

  async createPricingScenario(estimateId: string, dto: CreatePricingScenarioDto, actorId: string) {
    const estimate = await this.prisma.estimate.findUnique({ where: { id: estimateId } });
    if (!estimate) throw new NotFoundException({ code: 'ESTIMATE_NOT_FOUND', message: 'Estimate not found' });

    const exists = await this.prisma.pricingScenario.findUnique({
      where: { estimateId_scenarioType: { estimateId, scenarioType: dto.scenarioType } },
    });
    if (exists) throw new ConflictException({ code: 'SCENARIO_EXISTS', message: `Scenario ${dto.scenarioType} already exists on this estimate` });

    const scenario = await this.prisma.pricingScenario.create({
      data: { estimateId, scenarioType: dto.scenarioType, amount: dto.amount, marginPct: dto.marginPct ?? 0, note: dto.note ?? null },
    });

    await this.audit.record({ userId: actorId, action: 'PricingScenario.CREATE', resource: 'PricingScenario', resourceId: scenario.id, newValue: { estimateNumber: estimate.estimateNumber, scenarioType: dto.scenarioType, amount: Number(dto.amount) }, source: 'api' });
    return scenario;
  }
}
