import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { AnswerRfiDto, CreateRfiDto, ListRfiQueryDto } from '../../presentation/dto/engineering.dto';

@Injectable()
export class RfiService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  // FR-ENG-003: RFI — impact cost/schedule
  async createRfi(dto: CreateRfiDto, actorId: string) {
    const number = await this.seq.next('RFI', `RFI-${new Date().getFullYear()}-`);
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
}
