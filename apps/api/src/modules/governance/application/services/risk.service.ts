import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateRiskDto, ListRiskQueryDto, MitigateRiskDto } from '../../presentation/dto/governance.dto';

@Injectable()
export class RiskService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createRisk(dto: CreateRiskDto, actorId: string) {
    const score = Number(dto.likelihood) * Number(dto.impact);

    const risk = await this.prisma.$transaction(async (tx) => {
      const riskNumber = await this.seq.next('RSK', `RSK-${new Date().getFullYear()}-`, tx);
      return tx.risk.create({
        data: {
          riskNumber,
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
    });

    await this.audit.record({ userId: actorId, action: 'Risk.CREATE', resource: 'Risk', resourceId: risk.id, newValue: { riskNumber: risk.riskNumber, score, category: risk.category }, source: 'api' });
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
}
