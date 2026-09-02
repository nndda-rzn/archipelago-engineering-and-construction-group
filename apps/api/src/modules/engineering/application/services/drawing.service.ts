import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateDrawingDto, ListDrawingQueryDto, PublishDrawingDto } from '../../presentation/dto/engineering.dto';

@Injectable()
export class DrawingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createDrawing(dto: CreateDrawingDto, actorId: string) {
    const number = await this.seq.next('DRW', `DRW-${new Date().getFullYear()}-`);
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

  async publishDrawing(id: string, dto: PublishDrawingDto, actorId: string) {
    const drawing = await this.prisma.drawing.findUnique({ where: { id } });
    if (!drawing) throw new NotFoundException({ code: 'DRAWING_NOT_FOUND', message: 'Drawing tidak ditemukan' });

    const revision = dto.revision ?? String(Number(drawing.currentRevision) + 1);
    await this.prisma.drawingRevision.create({
      data: { drawingId: id, revision, description: dto.description ?? null, publishedBy: actorId },
    });
    const updated = await this.prisma.drawing.update({
      where: { id },
      data: { currentRevision: revision, status: 'PUBLISHED', isIFC: dto.isIFC ?? drawing.isIFC },
      include: { revisions: { orderBy: { publishedAt: 'desc' } } },
    });
    await this.audit.record({ userId: actorId, action: 'Drawing.PUBLISH', resource: 'Drawing', resourceId: id, newValue: { drawingNumber: drawing.drawingNumber, revision, isIFC: dto.isIFC ?? drawing.isIFC }, source: 'api' });
    return updated;
  }

  async listIfc(projectId: string) {
    const items = await this.prisma.drawing.findMany({
      where: { projectId, isIFC: true },
      orderBy: { updatedAt: 'desc' },
    });
    return { projectId, total: items.length, items };
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
}
