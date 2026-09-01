import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateObservationDto, ListObservationQueryDto } from '../../presentation/dto/hse.dto';

@Injectable()
export class SafetyObservationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  // FR-HSE-001: safety observation
  async createObservation(dto: CreateObservationDto, actorId: string) {
    const obsNumber = await this.seq.next('OBS', `OBS-${new Date().getFullYear()}-`);
    const obs = await this.prisma.safetyObservation.create({
      data: {
        observationNumber: obsNumber,
        projectId: dto.projectId ?? null,
        observationDate: dto.observationDate ? new Date(dto.observationDate) : new Date(),
        type: dto.type ?? 'UNSAFE',
        description: dto.description,
        observedBy: actorId,
      },
      include: { project: { select: { code: true, name: true } } },
    });
    await this.audit.record({ userId: actorId, action: 'SafetyObservation.CREATE', resource: 'SafetyObservation', resourceId: obs.id, newValue: { observationNumber: obsNumber, type: obs.type }, source: 'api' });
    return obs;
  }

  async resolveObservation(id: string, actorId: string) {
    const obs = await this.prisma.safetyObservation.findUnique({ where: { id } });
    if (!obs) throw new NotFoundException({ code: 'OBSERVATION_NOT_FOUND', message: 'Observasi tidak ditemukan' });
    if (obs.status !== 'OPEN') {
      throw new ConflictException({ code: 'NOT_OPEN', message: `Hanya OPEN yang bisa di-resolve (${obs.status})` });
    }
    const resolved = await this.prisma.safetyObservation.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
    await this.audit.record({ userId: actorId, action: 'SafetyObservation.RESOLVE', resource: 'SafetyObservation', resourceId: id, newValue: { observationNumber: obs.observationNumber }, source: 'api' });
    return resolved;
  }

  async listObservations(query: ListObservationQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.SafetyObservationWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.safetyObservation.findMany({ where, include: { project: { select: { code: true, name: true } } }, orderBy: { observationDate: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.safetyObservation.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
