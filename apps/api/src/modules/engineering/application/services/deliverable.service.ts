import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateDeliverableDto, ListDeliverableQueryDto, UpdateDeliverableStatusDto } from '../../presentation/dto/engineering.dto';

@Injectable()
export class DeliverableService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  // FR-ENG-001: deliverable register
  async createDeliverable(dto: CreateDeliverableDto, actorId: string) {
    const number = await this.seq.next('DLV', `DLV-${new Date().getFullYear()}-`);
    const item = await this.prisma.deliverable.create({
      data: {
        deliverableNumber: number,
        projectId: dto.projectId ?? null,
        title: dto.title,
        discipline: dto.discipline ?? 'PIPING',
        engineer: dto.engineer,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : null,
        forecastDate: dto.forecastDate ? new Date(dto.forecastDate) : null,
      },
      include: { project: { select: { code: true } } },
    });
    await this.audit.record({ userId: actorId, action: 'Deliverable.CREATE', resource: 'Deliverable', resourceId: item.id, newValue: { deliverableNumber: number, title: dto.title }, source: 'api' });
    return item;
  }

  async updateDeliverableStatus(id: string, dto: UpdateDeliverableStatusDto, actorId: string) {
    const item = await this.prisma.deliverable.findUnique({ where: { id } });
    if (!item) throw new NotFoundException({ code: 'DELIVERABLE_NOT_FOUND', message: 'Deliverable tidak ditemukan' });
    const updated = await this.prisma.deliverable.update({
      where: { id },
      data: {
        status: dto.status,
        actualDate: dto.status === 'ISSUED' ? new Date() : null,
        forecastDate: dto.forecastDate ? new Date(dto.forecastDate) : item.forecastDate,
      },
    });
    await this.audit.record({ userId: actorId, action: 'Deliverable.STATUS', resource: 'Deliverable', resourceId: id, newValue: { status: dto.status }, source: 'api' });
    return updated;
  }

  async listDeliverables(query: ListDeliverableQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.DeliverableWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.discipline ? { discipline: query.discipline } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.deliverable.findMany({ where, include: { project: { select: { code: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.deliverable.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
