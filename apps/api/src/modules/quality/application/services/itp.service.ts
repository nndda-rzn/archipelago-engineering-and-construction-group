import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateItpDto, ListItpQueryDto } from '../../presentation/dto/quality.dto';

@Injectable()
export class ItpService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createItp(dto: CreateItpDto, actorId: string) {
    const itpNumber = await this.seq.next('ITP', `ITP-${new Date().getFullYear()}-`);
    const itp = await this.prisma.itp.create({
      data: {
        itpNumber,
        projectId: dto.projectId ?? null,
        workPackageId: dto.workPackageId ?? null,
        title: dto.title,
        description: dto.description ?? null,
      },
      include: { workPackage: { select: { wpNumber: true, title: true } } },
    });
    await this.audit.record({ userId: actorId, action: 'Itp.CREATE', resource: 'Itp', resourceId: itp.id, newValue: { itpNumber, title: dto.title }, source: 'api' });
    return itp;
  }

  async listItps(query: ListItpQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.ItpWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.itp.findMany({ where, include: { workPackage: { select: { wpNumber: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.itp.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
