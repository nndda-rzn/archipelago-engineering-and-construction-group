import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import type { CreateIncidentDto, ListIncidentQueryDto } from '../../presentation/dto/hse.dto';

@Injectable()
export class HseIncidentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async createIncident(dto: CreateIncidentDto, actorId: string) {
    const incident = await this.prisma.$transaction(async (tx) => {
      const incidentNumber = await this.seq.next('INC', `INC-${new Date().getFullYear()}-`, tx);
      return tx.hseIncident.create({
        data: {
          incidentNumber,
          projectId: dto.projectId ?? null,
          incidentDate: dto.incidentDate ? new Date(dto.incidentDate) : new Date(),
          type: dto.type ?? 'NEAR_MISS',
          severity: dto.severity ?? 'MEDIUM',
          description: dto.description,
          reportedBy: actorId,
        },
        include: { project: { select: { code: true, name: true } } },
      });
    });
    await this.audit.record({ userId: actorId, action: 'HseIncident.CREATE', resource: 'HseIncident', resourceId: incident.id, newValue: { incidentNumber: incident.incidentNumber, severity: incident.severity, type: incident.type }, source: 'api' });
    await invalidateAnalytics(this.cache);
    return incident;
  }

  async investigateIncident(id: string, dto: { rootCause?: string }, actorId: string) {
    const incident = await this.prisma.hseIncident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException({ code: 'INCIDENT_NOT_FOUND', message: 'Insiden tidak ditemukan' });
    if (incident.status === 'RESOLVED') {
      throw new ConflictException({ code: 'ALREADY_RESOLVED', message: 'Insiden sudah resolved' });
    }
    const updated = await this.prisma.hseIncident.update({ where: { id }, data: { rootCause: dto.rootCause ?? incident.rootCause, status: 'INVESTIGATING' } });
    await this.audit.record({ userId: actorId, action: 'HseIncident.INVESTIGATE', resource: 'HseIncident', resourceId: id, newValue: { incidentNumber: incident.incidentNumber }, source: 'api' });
    await invalidateAnalytics(this.cache);
    return updated;
  }

  async resolveIncident(id: string, actorId: string) {
    const incident = await this.prisma.hseIncident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException({ code: 'INCIDENT_NOT_FOUND', message: 'Insiden tidak ditemukan' });
    if (incident.status === 'RESOLVED') {
      throw new ConflictException({ code: 'ALREADY_RESOLVED', message: 'Insiden sudah resolved' });
    }
    const resolved = await this.prisma.hseIncident.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
    await this.audit.record({ userId: actorId, action: 'HseIncident.RESOLVE', resource: 'HseIncident', resourceId: id, newValue: { incidentNumber: incident.incidentNumber }, source: 'api' });
    await invalidateAnalytics(this.cache);
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
      this.prisma.hseIncident.findMany({ where, include: { project: { select: { code: true, name: true } }, correctiveActions: { orderBy: { createdAt: 'desc' }, take: 5 } }, orderBy: { incidentDate: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.hseIncident.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
