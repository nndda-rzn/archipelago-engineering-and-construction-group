import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CloseCorrectiveActionDto, CreateCorrectiveActionDto } from '../../presentation/dto/hse.dto';

@Injectable()
export class CorrectiveActionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createCorrectiveAction(dto: CreateCorrectiveActionDto, actorId: string) {
    const source = dto.sourceType === 'OBSERVATION'
      ? await this.prisma.safetyObservation.findUnique({ where: { id: dto.sourceId } })
      : await this.prisma.hseIncident.findUnique({ where: { id: dto.sourceId } });
    if (!source) throw new NotFoundException({ code: 'SOURCE_NOT_FOUND', message: 'Observation/incident source not found' });

    const ca = await this.prisma.correctiveAction.create({
      data: {
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        incidentId: dto.sourceType === 'INCIDENT' ? dto.sourceId : null,
        action: dto.action,
        owner: dto.owner,
        dueDate: new Date(dto.dueDate),
      },
    });
    await this.audit.record({ userId: actorId, action: 'CorrectiveAction.CREATE', resource: 'CorrectiveAction', resourceId: ca.id, newValue: { sourceType: dto.sourceType, sourceId: dto.sourceId }, source: 'api' });
    return ca;
  }

  async closeCorrectiveAction(id: string, dto: CloseCorrectiveActionDto, actorId: string) {
    const ca = await this.prisma.correctiveAction.findUnique({ where: { id } });
    if (!ca) throw new NotFoundException({ code: 'CA_NOT_FOUND', message: 'Corrective action not found' });
    if (ca.status === 'CLOSED' || ca.status === 'VERIFIED') {
      throw new ConflictException({ code: 'ALREADY_CLOSED', message: `CA is already ${ca.status}` });
    }
    const closed = await this.prisma.correctiveAction.update({
      where: { id },
      data: { status: 'VERIFIED', evidence: dto.evidence ?? ca.evidence, verifiedBy: actorId, verifiedAt: new Date() },
    });
    await this.audit.record({ userId: actorId, action: 'CorrectiveAction.VERIFY', resource: 'CorrectiveAction', resourceId: id, newValue: { status: 'VERIFIED' }, source: 'api' });
    return closed;
  }
}
