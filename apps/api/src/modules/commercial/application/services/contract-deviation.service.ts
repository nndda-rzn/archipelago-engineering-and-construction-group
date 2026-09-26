import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateContractDeviationDto } from '../../presentation/dto/tender.dto';

@Injectable()
export class ContractDeviationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createContractDeviation(opportunityId: string, dto: CreateContractDeviationDto, actorId: string) {
    const opp = await this.prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opp) throw new NotFoundException({ code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' });

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
    if (!deviation) throw new NotFoundException({ code: 'DEVIATION_NOT_FOUND', message: 'Deviation not found' });
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
}
