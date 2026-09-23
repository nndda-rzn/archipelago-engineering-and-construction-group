import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { SequenceHelper } from '@/shared/utils/sequence.helper';
import type { CreateTenderSubmissionDto, ListTenderQueryDto } from '../../presentation/dto/tender.dto';

@Injectable()
export class TenderSubmissionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceHelper) private readonly seq: SequenceHelper,
  ) {}

  async createTenderSubmission(dto: CreateTenderSubmissionDto, actorId: string) {
    const opp = await this.prisma.opportunity.findUnique({ where: { id: dto.opportunityId } });
    if (!opp) throw new NotFoundException({ code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity tidak ditemukan' });

    if (dto.estimateId) {
      const estimate = await this.prisma.estimate.findUnique({ where: { id: dto.estimateId } });
      if (!estimate || estimate.opportunityId !== dto.opportunityId) {
        throw new NotFoundException({ code: 'ESTIMATE_NOT_FOUND', message: 'Estimate tidak ditemukan di opportunity ini' });
      }
    }

    const submission = await this.prisma.$transaction(async (tx) => {
      const submissionNumber = await this.seq.next('TSB', `TSB-${new Date().getFullYear()}-`, tx);
      return tx.tenderSubmission.create({
        data: {
          submissionNumber,
          opportunityId: dto.opportunityId,
          estimateId: dto.estimateId ?? null,
          channel: dto.channel ?? 'ELECTRONIC',
          packageVersion: dto.packageVersion ?? null,
          submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : new Date(),
          submittedBy: actorId,
          acknowledgement: dto.acknowledgement ?? null,
          fileHash: dto.fileHash ?? null,
        },
      });
    });

    await this.audit.record({ userId: actorId, action: 'TenderSubmission.CREATE', resource: 'TenderSubmission', resourceId: submission.id, newValue: { submissionNumber: submission.submissionNumber, channel: dto.channel ?? 'ELECTRONIC', packageVersion: dto.packageVersion ?? null }, source: 'api' });
    return submission;
  }

  async listTenderSubmissions(query: ListTenderQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);
    const where: Prisma.TenderSubmissionWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tenderSubmission.findMany({
        where,
        include: { opportunity: { select: { oppNumber: true, title: true } }, estimate: { select: { estimateNumber: true, version: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tenderSubmission.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
