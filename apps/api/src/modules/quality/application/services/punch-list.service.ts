import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import type { ClosePunchItemDto, CreatePunchItemDto, ListPunchItemQueryDto } from '../../presentation/dto/quality.dto';

@Injectable()
export class PunchListService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async createPunchItem(dto: CreatePunchItemDto, actorId: string) {
    const punchNumber = await this.seq.next('PUN', `PUN-${new Date().getFullYear()}-`);
    const item = await this.prisma.punchListItem.create({
      data: {
        punchNumber,
        projectId: dto.projectId ?? null,
        workPackageId: dto.workPackageId ?? null,
        handoverPackageId: dto.handoverPackageId ?? null,
        description: dto.description,
      },
    });
    await this.audit.record({ userId: actorId, action: 'PunchListItem.CREATE', resource: 'PunchListItem', resourceId: item.id, newValue: { punchNumber }, source: 'api' });
    await invalidateAnalytics(this.cache);
    return item;
  }

  async closePunchItem(id: string, dto: ClosePunchItemDto, actorId: string) {
    const item = await this.prisma.punchListItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException({ code: 'PUNCH_NOT_FOUND', message: 'Punch item tidak ditemukan' });
    if (item.status === 'CLOSED') {
      throw new ConflictException({ code: 'ALREADY_CLOSED', message: 'Punch item sudah closed' });
    }
    const updated = await this.prisma.punchListItem.update({ where: { id }, data: { status: 'CLOSED', closedAt: new Date(), closedBy: actorId } });
    await this.audit.record({ userId: actorId, action: 'PunchListItem.CLOSE', resource: 'PunchListItem', resourceId: id, newValue: { punchNumber: item.punchNumber }, source: 'api' });
    await invalidateAnalytics(this.cache);
    return updated;
  }

  async listPunchItems(query: ListPunchItemQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.PunchListItemWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.punchListItem.findMany({ where, include: { workPackage: { select: { wpNumber: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.punchListItem.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
