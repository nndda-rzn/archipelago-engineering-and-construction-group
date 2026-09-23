import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateSubmittalDto, ListSubmittalQueryDto, ReviewSubmittalDto } from '../../presentation/dto/engineering.dto';

@Injectable()
export class SubmittalService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createSubmittal(dto: CreateSubmittalDto, actorId: string) {
    const item = await this.prisma.$transaction(async (tx) => {
      const number = await this.seq.next('SUB', `SUB-${new Date().getFullYear()}-`, tx);
      return tx.submittal.create({
        data: {
          submittalNumber: number,
          projectId: dto.projectId ?? null,
          title: dto.title,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        },
        include: { project: { select: { code: true } } },
      });
    });
    await this.audit.record({ userId: actorId, action: 'Submittal.CREATE', resource: 'Submittal', resourceId: item.id, newValue: { submittalNumber: item.submittalNumber, title: dto.title }, source: 'api' });
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
}
