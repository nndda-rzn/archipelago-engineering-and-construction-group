import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateTransmittalDto, ListTransmittalQueryDto } from '../../presentation/dto/engineering.dto';

@Injectable()
export class TransmittalService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  // FR-ENG-005: transmittal
  async createTransmittal(dto: CreateTransmittalDto, actorId: string) {
    const number = await this.seq.next('TRM', `TRM-${new Date().getFullYear()}-`);
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
