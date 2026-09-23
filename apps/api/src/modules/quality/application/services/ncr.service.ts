import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import type { CreateNcrDto, DisposeNcrDto, ListNcrQueryDto, ReinspectNcrDto } from '../../presentation/dto/quality.dto';

@Injectable()
export class NcrService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async createNcr(dto: CreateNcrDto, actorId: string) {
    const ncr = await this.prisma.$transaction(async (tx) => {
      const ncrNumber = await this.seq.next('NCR', `NCR-${new Date().getFullYear()}-`, tx);
      return tx.ncr.create({
        data: {
          ncrNumber,
          projectId: dto.projectId ?? null,
          workPackageId: dto.workPackageId ?? null,
          category: dto.category ?? 'WORKMANSHIP',
          severity: dto.severity ?? 'MINOR',
          description: dto.description,
          reinspectionRequired: dto.reinspectionRequired ?? true,
        },
        include: { workPackage: { select: { wpNumber: true, title: true } } },
      });
    });
    await this.audit.record({ userId: actorId, action: 'Ncr.CREATE', resource: 'Ncr', resourceId: ncr.id, newValue: { ncrNumber: ncr.ncrNumber, severity: ncr.severity, category: ncr.category }, source: 'api' });
    await invalidateAnalytics(this.cache);
    return ncr;
  }

  async disposeNcr(id: string, dto: DisposeNcrDto, actorId: string) {
    const ncr = await this.prisma.ncr.findUnique({ where: { id } });
    if (!ncr) throw new NotFoundException({ code: 'NCR_NOT_FOUND', message: 'NCR tidak ditemukan' });
    if (ncr.status !== 'OPEN') {
      throw new ConflictException({ code: 'NOT_OPEN', message: `Hanya OPEN yang bisa di-dispose (${ncr.status})` });
    }
    const updated = await this.prisma.ncr.update({ where: { id }, data: { status: 'UNDER_REVIEW', rootCause: dto.rootCause ?? ncr.rootCause, correctiveAction: dto.correctiveAction ?? ncr.correctiveAction } });
    await this.audit.record({ userId: actorId, action: 'Ncr.DISPOSE', resource: 'Ncr', resourceId: id, newValue: { ncrNumber: ncr.ncrNumber }, source: 'api' });
    await invalidateAnalytics(this.cache);
    return updated;
  }

  async reinspectNcr(id: string, dto: ReinspectNcrDto, actorId: string) {
    const ncr = await this.prisma.ncr.findUnique({ where: { id } });
    if (!ncr) throw new NotFoundException({ code: 'NCR_NOT_FOUND', message: 'NCR tidak ditemukan' });
    if (ncr.status === 'CLOSED') {
      throw new ConflictException({ code: 'ALREADY_CLOSED', message: 'NCR sudah closed' });
    }
    if (!['PASS', 'FAIL'].includes(dto.result)) {
      throw new BadRequestException({ code: 'INVALID_RESULT', message: 'Result harus PASS atau FAIL' });
    }
    const updated = await this.prisma.ncr.update({ where: { id }, data: { reinspectionResult: dto.result, status: dto.result === 'PASS' ? 'CLOSED' : 'UNDER_REVIEW', closedAt: dto.result === 'PASS' ? new Date() : null } });
    await this.audit.record({ userId: actorId, action: 'Ncr.REINSPECT', resource: 'Ncr', resourceId: id, newValue: { result: dto.result, status: updated.status }, source: 'api' });
    await invalidateAnalytics(this.cache);
    return updated;
  }

  async listNcrs(query: ListNcrQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.NcrWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ncr.findMany({ where, include: { workPackage: { select: { wpNumber: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.ncr.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
