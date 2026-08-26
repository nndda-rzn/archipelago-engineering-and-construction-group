import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateObservationDto, ListObservationQueryDto, CreateIncidentDto, ListIncidentQueryDto,
  CreatePermitDto, ListPermitQueryDto, CreateCorrectiveActionDto, CloseCorrectiveActionDto,
} from '../../presentation/dto/hse.dto';

@Injectable()
export class HseService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // FR-HSE-001: safety observation
  async createObservation(dto: CreateObservationDto, actorId: string) {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'OBS' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'OBS', prefix: `OBS-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const obs = await this.prisma.safetyObservation.create({
      data: {
        observationNumber: seq,
        projectId: dto.projectId ?? null,
        observationDate: dto.observationDate ? new Date(dto.observationDate) : new Date(),
        type: dto.type ?? 'UNSAFE',
        description: dto.description,
        observedBy: actorId,
      },
      include: { project: { select: { code: true, name: true } } },
    });

    await this.audit.record({
      userId: actorId,
      action: 'SafetyObservation.CREATE',
      resource: 'SafetyObservation',
      resourceId: obs.id,
      newValue: { observationNumber: seq, type: obs.type },
      source: 'api',
    });

    return obs;
  }

  async resolveObservation(id: string, actorId: string) {
    const obs = await this.prisma.safetyObservation.findUnique({ where: { id } });
    if (!obs) throw new NotFoundException({ code: 'OBSERVATION_NOT_FOUND', message: 'Observasi tidak ditemukan' });
    if (obs.status !== 'OPEN') {
      throw new ConflictException({ code: 'NOT_OPEN', message: `Hanya OPEN yang bisa di-resolve (${obs.status})` });
    }
    const resolved = await this.prisma.safetyObservation.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
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
      this.prisma.safetyObservation.findMany({
        where,
        include: { project: { select: { code: true, name: true } } },
        orderBy: { observationDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.safetyObservation.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-HSE-002: incident — severity + escalation
  async createIncident(dto: CreateIncidentDto, actorId: string) {
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'INC' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'INC', prefix: `INC-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const incident = await this.prisma.hseIncident.create({
      data: {
        incidentNumber: seq,
        projectId: dto.projectId ?? null,
        incidentDate: dto.incidentDate ? new Date(dto.incidentDate) : new Date(),
        type: dto.type ?? 'NEAR_MISS',
        severity: dto.severity ?? 'MEDIUM',
        description: dto.description,
        reportedBy: actorId,
      },
      include: { project: { select: { code: true, name: true } } },
    });

    await this.audit.record({
      userId: actorId,
      action: 'HseIncident.CREATE',
      resource: 'HseIncident',
      resourceId: incident.id,
      newValue: { incidentNumber: seq, severity: incident.severity, type: incident.type },
      source: 'api',
    });

    return incident;
  }

  // FR-HSE-003: investigation — root cause + resolve
  async investigateIncident(id: string, dto: { rootCause?: string }, actorId: string) {
    const incident = await this.prisma.hseIncident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException({ code: 'INCIDENT_NOT_FOUND', message: 'Insiden tidak ditemukan' });
    if (incident.status === 'RESOLVED') {
      throw new ConflictException({ code: 'ALREADY_RESOLVED', message: 'Insiden sudah resolved' });
    }
    const updated = await this.prisma.hseIncident.update({
      where: { id },
      data: { rootCause: dto.rootCause ?? incident.rootCause, status: 'INVESTIGATING' },
    });
    await this.audit.record({ userId: actorId, action: 'HseIncident.INVESTIGATE', resource: 'HseIncident', resourceId: id, newValue: { incidentNumber: incident.incidentNumber }, source: 'api' });
    return updated;
  }

  async resolveIncident(id: string, actorId: string) {
    const incident = await this.prisma.hseIncident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException({ code: 'INCIDENT_NOT_FOUND', message: 'Insiden tidak ditemukan' });
    if (incident.status === 'RESOLVED') {
      throw new ConflictException({ code: 'ALREADY_RESOLVED', message: 'Insiden sudah resolved' });
    }
    const resolved = await this.prisma.hseIncident.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    await this.audit.record({ userId: actorId, action: 'HseIncident.RESOLVE', resource: 'HseIncident', resourceId: id, newValue: { incidentNumber: incident.incidentNumber }, source: 'api' });
    return resolved;
  }

  async listIncidents(query: ListIncidentQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.HseIncidentWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.hseIncident.findMany({
        where,
        include: { project: { select: { code: true, name: true } }, correctiveActions: { orderBy: { createdAt: 'desc' } } },
        orderBy: { incidentDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.hseIncident.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-HSE-004: permit to work
  async createPermit(dto: CreatePermitDto, actorId: string) {
    if (dto.validFrom && dto.validTo && new Date(dto.validTo) <= new Date(dto.validFrom)) {
      throw new BadRequestException({ code: 'INVALID_PERIOD', message: 'validTo harus setelah validFrom' });
    }
    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'PTW' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'PTW', prefix: `PTW-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const permit = await this.prisma.permitToWork.create({
      data: {
        permitNumber: seq,
        projectId: dto.projectId ?? null,
        area: dto.area,
        description: dto.description ?? null,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
        issuedTo: dto.issuedTo,
      },
      include: { project: { select: { code: true, name: true } } },
    });

    await this.audit.record({ userId: actorId, action: 'PermitToWork.CREATE', resource: 'PermitToWork', resourceId: permit.id, newValue: { permitNumber: seq, area: dto.area }, source: 'api' });
    return permit;
  }

  async revokePermit(id: string, actorId: string) {
    const permit = await this.prisma.permitToWork.findUnique({ where: { id } });
    if (!permit) throw new NotFoundException({ code: 'PERMIT_NOT_FOUND', message: 'Permit tidak ditemukan' });
    if (permit.status !== 'ACTIVE') {
      throw new ConflictException({ code: 'NOT_ACTIVE', message: `Hanya ACTIVE yang bisa dicabut (${permit.status})` });
    }
    const revoked = await this.prisma.permitToWork.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedBy: actorId },
    });
    await this.audit.record({ userId: actorId, action: 'PermitToWork.REVOKE', resource: 'PermitToWork', resourceId: id, newValue: { permitNumber: permit.permitNumber }, source: 'api' });
    return revoked;
  }

  async listPermits(query: ListPermitQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.PermitToWorkWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.permitToWork.findMany({
        where,
        include: { project: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.permitToWork.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-HSE-005: corrective action — owner, due date, evidence, verification
  async createCorrectiveAction(dto: CreateCorrectiveActionDto, actorId: string) {
    const source =
      dto.sourceType === 'OBSERVATION'
        ? await this.prisma.safetyObservation.findUnique({ where: { id: dto.sourceId } })
        : await this.prisma.hseIncident.findUnique({ where: { id: dto.sourceId } });
    if (!source) throw new NotFoundException({ code: 'SOURCE_NOT_FOUND', message: 'Source observasi/insiden tidak ditemukan' });

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
    if (!ca) throw new NotFoundException({ code: 'CA_NOT_FOUND', message: 'Corrective action tidak ditemukan' });
    if (ca.status === 'CLOSED' || ca.status === 'VERIFIED') {
      throw new ConflictException({ code: 'ALREADY_CLOSED', message: `CA sudah ${ca.status}` });
    }
    const closed = await this.prisma.correctiveAction.update({
      where: { id },
      data: { status: 'VERIFIED', evidence: dto.evidence ?? ca.evidence, verifiedBy: actorId, verifiedAt: new Date() },
    });
    await this.audit.record({ userId: actorId, action: 'CorrectiveAction.VERIFY', resource: 'CorrectiveAction', resourceId: id, newValue: { status: 'VERIFIED' }, source: 'api' });
    return closed;
  }
}
