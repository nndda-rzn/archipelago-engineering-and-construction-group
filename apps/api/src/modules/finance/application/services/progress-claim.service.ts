import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateProgressClaimDto, CertifyClaimDto, ListProgressClaimQueryDto } from '../../presentation/dto/finance.dto';

@Injectable()
export class ProgressClaimService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createProgressClaim(dto: CreateProgressClaimDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'CLM' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'CLM', prefix: `CLM-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const claim = await this.prisma.progressClaim.create({
      data: {
        claimNumber: seq,
        projectId: dto.projectId,
        claimDate: dto.claimDate ? new Date(dto.claimDate) : new Date(),
        period: dto.period ?? null,
        description: dto.description ?? null,
        amount: Number(dto.amount),
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'ProgressClaim.CREATE',
      resource: 'ProgressClaim',
      resourceId: claim.id,
      newValue: { claimNumber: seq, amount: Number(dto.amount), projectId: dto.projectId },
      source: 'api',
    });

    return claim;
  }

  async certifyClaim(id: string, dto: CertifyClaimDto, actorId: string) {
    const claim = await this.prisma.progressClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException({ code: 'CLAIM_NOT_FOUND', message: 'Claim tidak ditemukan' });
    if (claim.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Hanya DRAFT yang bisa disertifikasi (${claim.status})` });
    }

    const certified = await this.prisma.progressClaim.update({
      where: { id },
      data: { status: 'CERTIFIED', certifiedAmount: Number(dto.certifiedAmount), certifiedBy: actorId, certifiedAt: new Date(), remark: dto.remark ?? null },
    });

    await this.audit.record({
      userId: actorId,
      action: 'ProgressClaim.CERTIFY',
      resource: 'ProgressClaim',
      resourceId: id,
      newValue: { claimNumber: claim.claimNumber, certifiedAmount: Number(dto.certifiedAmount) },
      source: 'api',
    });

    return certified;
  }

  async listProgressClaims(query: ListProgressClaimQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.ProgressClaimWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.progressClaim.findMany({
        where,
        include: { project: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.progressClaim.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}