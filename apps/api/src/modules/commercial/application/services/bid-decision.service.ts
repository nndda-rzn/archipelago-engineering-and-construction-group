import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateBidDecisionDto, ListTenderQueryDto } from '../../presentation/dto/tender.dto';

@Injectable()
export class BidDecisionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

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
}
