import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CompleteAccessReviewDto, CreateAccessReviewDto, ListAccessReviewQueryDto } from '../../presentation/dto/governance.dto';

@Injectable()
export class AccessReviewService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  // FR-GOV-004: access review berkala
  async createAccessReview(dto: CreateAccessReviewDto, actorId: string) {
    const reviewNumber = await this.seq.next('ACR', `ACR-${new Date().getFullYear()}-`);
    const review = await this.prisma.accessReview.create({
      data: { reviewNumber, period: dto.period },
    });
    await this.audit.record({ userId: actorId, action: 'AccessReview.CREATE', resource: 'AccessReview', resourceId: review.id, newValue: { reviewNumber, period: dto.period }, source: 'api' });
    return review;
  }

  async completeAccessReview(id: string, dto: CompleteAccessReviewDto, actorId: string) {
    const review = await this.prisma.accessReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException({ code: 'REVIEW_NOT_FOUND', message: 'Access review tidak ditemukan' });
    if (review.status === 'COMPLETED') {
      throw new ConflictException({ code: 'ALREADY_COMPLETED', message: 'Access review sudah completed' });
    }
    const updated = await this.prisma.accessReview.update({
      where: { id },
      data: { status: 'COMPLETED', notes: dto.notes ?? review.notes, reviewedBy: actorId, reviewedAt: new Date() },
    });
    await this.audit.record({ userId: actorId, action: 'AccessReview.COMPLETE', resource: 'AccessReview', resourceId: id, newValue: { reviewNumber: review.reviewNumber }, source: 'api' });
    return updated;
  }

  async listAccessReviews(query: ListAccessReviewQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.AccessReviewWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.accessReview.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.accessReview.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
