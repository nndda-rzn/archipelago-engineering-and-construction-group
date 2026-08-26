import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateDeliverableDto, ListDeliverableQueryDto, UpdateDeliverableStatusDto,
  CreateDrawingDto, ListDrawingQueryDto, PublishDrawingDto,
  CreateRfiDto, ListRfiQueryDto, AnswerRfiDto,
  CreateSubmittalDto, ListSubmittalQueryDto, ReviewSubmittalDto,
  CreateTransmittalDto, ListTransmittalQueryDto,
} from '../../presentation/dto/engineering.dto';

@Injectable()
export class EngineeringService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private async nextNumber(code: string, prefix: string) {
    return this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code },
        update: { nextNumber: { increment: 1 } },
        create: { code, prefix: `${prefix}-${new Date().getFullYear()}-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });
  }

  // FR-ENG-001: deliverable register
  async createDeliverable(dto: CreateDeliverableDto, actorId: string) {
    const number = await this.nextNumber('DLV', 'DLV');
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

  // FR-ENG-002: drawing + revision — published immutable
  async createDrawing(dto: CreateDrawingDto, actorId: string) {
    const number = await this.nextNumber('DRW', 'DRW');
    const drawing = await this.prisma.drawing.create({
      data: {
        drawingNumber: number,
        projectId: dto.projectId ?? null,
        title: dto.title,
        discipline: dto.discipline ?? 'PIPING',
      },
      include: { project: { select: { code: true } } },
    });
    await this.audit.record({ userId: actorId, action: 'Drawing.CREATE', resource: 'Drawing', resourceId: drawing.id, newValue: { drawingNumber: number, title: dto.title }, source: 'api' });
    return drawing;
  }

  // FR-ENG-002/012: publish revision — immutable, current revision bertambah
  async publishDrawing(id: string, dto: PublishDrawingDto, actorId: string) {
    const drawing = await this.prisma.drawing.findUnique({ where: { id } });
    if (!drawing) throw new NotFoundException({ code: 'DRAWING_NOT_FOUND', message: 'Drawing tidak ditemukan' });

    const revision = dto.revision ?? String(Number(drawing.currentRevision) + 1);
    await this.prisma.drawingRevision.create({
      data: { drawingId: id, revision, description: dto.description ?? null, publishedBy: actorId },
    });
    const updated = await this.prisma.drawing.update({
      where: { id },
      data: { currentRevision: revision, status: 'PUBLISHED' },
      include: { revisions: { orderBy: { publishedAt: 'desc' } } },
    });
    await this.audit.record({ userId: actorId, action: 'Drawing.PUBLISH', resource: 'Drawing', resourceId: id, newValue: { drawingNumber: drawing.drawingNumber, revision }, source: 'api' });
    return updated;
  }

  async listDrawings(query: ListDrawingQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.DrawingWhereInput = query.projectId ? { projectId: query.projectId } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.drawing.findMany({ where, include: { revisions: { orderBy: { publishedAt: 'desc' } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.drawing.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-ENG-003: RFI — impact cost/schedule
  async createRfi(dto: CreateRfiDto, actorId: string) {
    const number = await this.nextNumber('RFI', 'RFI');
    const rfi = await this.prisma.rfi.create({
      data: {
        rfiNumber: number,
        projectId: dto.projectId ?? null,
        title: dto.title,
        question: dto.question,
        createdBy: actorId,
      },
      include: { project: { select: { code: true } } },
    });
    await this.audit.record({ userId: actorId, action: 'Rfi.CREATE', resource: 'Rfi', resourceId: rfi.id, newValue: { rfiNumber: number, title: dto.title }, source: 'api' });
    return rfi;
  }

  async answerRfi(id: string, dto: AnswerRfiDto, actorId: string) {
    const rfi = await this.prisma.rfi.findUnique({ where: { id } });
    if (!rfi) throw new NotFoundException({ code: 'RFI_NOT_FOUND', message: 'RFI tidak ditemukan' });
    if (rfi.status === 'CLOSED') {
      throw new ConflictException({ code: 'ALREADY_CLOSED', message: 'RFI sudah closed' });
    }
    const updated = await this.prisma.rfi.update({
      where: { id },
      data: {
        answer: dto.answer,
        impactCost: dto.impactCost ?? null,
        impactScheduleDays: dto.impactScheduleDays ?? null,
        status: 'ANSWERED',
        answeredBy: actorId,
        answeredAt: new Date(),
      },
    });
    await this.audit.record({ userId: actorId, action: 'Rfi.ANSWER', resource: 'Rfi', resourceId: id, newValue: { rfiNumber: rfi.rfiNumber, impactCost: dto.impactCost ?? null }, source: 'api' });
    return updated;
  }

  async listRfis(query: ListRfiQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.RfiWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.rfi.findMany({ where, include: { project: { select: { code: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.rfi.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-ENG-004: submittal review cycle
  async createSubmittal(dto: CreateSubmittalDto, actorId: string) {
    const number = await this.nextNumber('SUB', 'SUB');
    const item = await this.prisma.submittal.create({
      data: {
        submittalNumber: number,
        projectId: dto.projectId ?? null,
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: { project: { select: { code: true } } },
    });
    await this.audit.record({ userId: actorId, action: 'Submittal.CREATE', resource: 'Submittal', resourceId: item.id, newValue: { submittalNumber: number, title: dto.title }, source: 'api' });
    return item;
  }

  async reviewSubmittal(id: string, dto: ReviewSubmittalDto, actorId: string) {
    const item = await this.prisma.submittal.findUnique({ where: { id } });
    if (!item) throw new NotFoundException({ code: 'SUBMITTAL_NOT_FOUND', message: 'Submittal tidak ditemukan' });
    const updated = await this.prisma.submittal.update({
      where: { id },
      data: { status: dto.status, responseNote: dto.responseNote ?? item.responseNote, reviewedBy: actorId, reviewedAt: new Date() },
    });
    await this.audit.record({ userId: actorId, action: 'Submittal.REVIEW', resource: 'Submittal', resourceId: id, newValue: { status: dto.status }, source: 'api' });
    return updated;
  }

  async listSubmittals(query: ListSubmittalQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.SubmittalWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.submittal.findMany({ where, include: { project: { select: { code: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.submittal.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // FR-ENG-005: transmittal
  async createTransmittal(dto: CreateTransmittalDto, actorId: string) {
    const number = await this.nextNumber('TRM', 'TRM');
    const item = await this.prisma.transmittal.create({
      data: {
        transmittalNumber: number,
        projectId: dto.projectId ?? null,
        recipient: dto.recipient,
        subject: dto.subject,
        documentList: dto.documentList ?? null,
        sentBy: actorId,
      },
      include: { project: { select: { code: true } } },
    });
    await this.audit.record({ userId: actorId, action: 'Transmittal.CREATE', resource: 'Transmittal', resourceId: item.id, newValue: { transmittalNumber: number, subject: dto.subject }, source: 'api' });
    return item;
  }

  async listTransmittals(query: ListTransmittalQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.TransmittalWhereInput = query.projectId ? { projectId: query.projectId } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.transmittal.findMany({ where, include: { project: { select: { code: true } } }, orderBy: { sentAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.transmittal.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
