import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import type { CreateVariationDto, ListVariationQueryDto } from '../../presentation/dto/finance.dto';

@Injectable()
export class VariationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async createVariation(dto: CreateVariationDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const variation = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'VR' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'VR', prefix: `VR-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
      return tx.projectVariation.create({
        data: {
          variationNumber: seq,
          projectId: dto.projectId,
          title: dto.title,
          description: dto.description ?? null,
          type: dto.type ?? 'ADDITIVE',
          amountChange: Number(dto.amountChange),
          scheduleImpactDays: dto.scheduleImpactDays ?? null,
          createdBy: actorId,
        },
        include: { project: { select: { code: true, name: true } } },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'Variation.CREATE',
      resource: 'Variation',
      resourceId: variation.id,
      newValue: { variationNumber: variation.variationNumber, title: dto.title, amountChange: Number(dto.amountChange), type: dto.type ?? 'ADDITIVE' },
      source: 'api',
    });

    return variation;
  }

  async approveVariation(id: string, actorId: string) {
    const variation = await this.prisma.projectVariation.findUnique({ where: { id } });
    if (!variation) throw new NotFoundException({ code: 'VARIATION_NOT_FOUND', message: 'Variation not found' });
    if (variation.status !== 'POTENTIAL') {
      throw new ConflictException({ code: 'NOT_POTENTIAL', message: `Only POTENTIAL can be approved (${variation.status})` });
    }

    const approved = await this.prisma.$transaction(async (tx) => {
      const v = await tx.projectVariation.update({
        where: { id },
        data: { status: 'APPROVED', approvedBy: actorId, approvedAt: new Date() },
      });

      const project = await tx.project.findUniqueOrThrow({ where: { id: v.projectId } });
      const base = project.contractValue != null ? Number(project.contractValue) : 0;
      const delta = v.type === 'DEDUCTIVE' ? -Number(v.amountChange) : Number(v.amountChange);
      const updated = Math.round((base + delta) * 100) / 100;
      await tx.project.update({
        where: { id: v.projectId },
        data: { contractValue: updated },
      });

      return v;
    });

    await this.audit.record({
      userId: actorId,
      action: 'Variation.APPROVE',
      resource: 'Variation',
      resourceId: id,
      newValue: {
        variationNumber: variation.variationNumber,
        amountChange: Number(variation.amountChange),
        type: variation.type,
        contractValueUpdated: true,
      },
      source: 'api',
    });

    // approveVariation mengubah project.contractValue -> memengaruhi cache analytics
    // (executive.totalContractValue, anomalies BUDGET_OVERRUN, projectCostSummary.contractValue).
    await invalidateAnalytics(this.cache);

    return approved;
  }

  async rejectVariation(id: string, actorId: string) {
    const variation = await this.prisma.projectVariation.findUnique({ where: { id } });
    if (!variation) throw new NotFoundException({ code: 'VARIATION_NOT_FOUND', message: 'Variation not found' });
    if (variation.status !== 'POTENTIAL') {
      throw new ConflictException({ code: 'NOT_POTENTIAL', message: `Only POTENTIAL can be rejected (${variation.status})` });
    }

    const rejected = await this.prisma.projectVariation.update({
      where: { id },
      data: { status: 'REJECTED', rejectedBy: actorId, rejectedAt: new Date() },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Variation.REJECT',
      resource: 'Variation',
      resourceId: id,
      newValue: { variationNumber: variation.variationNumber },
      source: 'api',
    });

    return rejected;
  }

  async listVariations(query: ListVariationQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.ProjectVariationWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectVariation.findMany({
        where,
        include: { project: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.projectVariation.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
