import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import type { CreateProgressClaimDto, CertifyClaimDto, ListProgressClaimQueryDto } from '../../presentation/dto/finance.dto';

@Injectable()
export class ProgressClaimService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async createProgressClaim(dto: CreateProgressClaimDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    let physicalProgressAtClaim: number | null = null;
    if (dto.workPackageId) {
      const wp = await this.prisma.constructionWorkPackage.findUnique({
        where: { id: dto.workPackageId },
        include: { progress: { orderBy: { progressDate: 'desc' }, take: 1, select: { physicalProgress: true } } },
      });
      if (!wp || wp.projectId !== dto.projectId) {
        throw new NotFoundException({ code: 'WP_NOT_FOUND', message: 'Work package not found in this project' });
      }
      physicalProgressAtClaim = dto.physicalProgressAtClaim ?? Number(wp.progress[0]?.physicalProgress ?? 0);
    }

    const claim = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'CLM' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'CLM', prefix: `CLM-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      const seq = `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
      return tx.progressClaim.create({
        data: {
          claimNumber: seq,
          projectId: dto.projectId,
          claimDate: dto.claimDate ? new Date(dto.claimDate) : new Date(),
          period: dto.period ?? null,
          description: dto.description ?? null,
          amount: Number(dto.amount),
          claimType: dto.claimType ?? 'PROGRESS',
          requestedExtensionDays: dto.requestedExtensionDays ?? null,
          workPackageId: dto.workPackageId ?? null,
          physicalProgressAtClaim,
          billableProgress: dto.billableProgress ?? null,
        },
        include: { workPackage: { select: { wpNumber: true, title: true } } },
      });
    });

    await this.audit.record({
      userId: actorId,
      action: 'ProgressClaim.CREATE',
      resource: 'ProgressClaim',
      resourceId: claim.id,
      newValue: {
        claimNumber: claim.claimNumber,
        amount: Number(dto.amount),
        claimType: dto.claimType ?? 'PROGRESS',
        requestedExtensionDays: dto.requestedExtensionDays ?? null,
        projectId: dto.projectId,
        workPackageId: dto.workPackageId ?? null,
        physicalProgressAtClaim,
        billableProgress: dto.billableProgress ?? null,
      },
      source: 'api',
    });

    await invalidateAnalytics(this.cache);

    return claim;
  }

  async certifyClaim(id: string, dto: CertifyClaimDto, actorId: string) {
    const claim = await this.prisma.progressClaim.findUnique({
      where: { id },
      include: { project: { select: { advanceAmount: true, advanceRecoveryRate: true } } },
    });
    if (!claim) throw new NotFoundException({ code: 'CLAIM_NOT_FOUND', message: 'Claim not found' });
    if (claim.status !== 'DRAFT') {
      throw new ConflictException({ code: 'NOT_DRAFT', message: `Only DRAFT can be certified (${claim.status})` });
    }

    const certifiedAmount = Number(dto.certifiedAmount);
    const retentionRate = dto.retentionRate ?? 0;
    const retentionAmount = Math.round(certifiedAmount * retentionRate) / 100;
    const netCertifiedAmount = Math.round((certifiedAmount - retentionAmount) * 100) / 100;

    const advanceAmount = claim.project.advanceAmount != null ? Number(claim.project.advanceAmount) : 0;
    const recoveryRate = Number(claim.project.advanceRecoveryRate ?? 0);
    let recoveryAmount = 0;
    let cumulativeRecovered: number | null = null;
    if (advanceAmount > 0 && recoveryRate > 0) {
      const { _sum } = await this.prisma.progressClaim.aggregate({
        where: { projectId: claim.projectId, status: 'CERTIFIED', id: { not: claim.id } },
        _sum: { recoveryAmount: true },
      });
      const recoveredSoFar = Number(_sum.recoveryAmount ?? 0);
      const remaining = Math.round((advanceAmount - recoveredSoFar) * 100) / 100;
      recoveryAmount = Math.min(Math.round(netCertifiedAmount * recoveryRate) / 100, remaining, netCertifiedAmount);
      cumulativeRecovered = Math.round((recoveredSoFar + recoveryAmount) * 100) / 100;
    }

    const certified = await this.prisma.progressClaim.update({
      where: { id },
      data: {
        status: 'CERTIFIED',
        certifiedAmount,
        retentionRate,
        retentionAmount,
        netCertifiedAmount,
        recoveryAmount: recoveryAmount > 0 || advanceAmount > 0 ? recoveryAmount : null,
        cumulativeRecovered,
        certifiedBy: actorId,
        certifiedAt: new Date(),
        remark: dto.remark ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'ProgressClaim.CERTIFY',
      resource: 'ProgressClaim',
      resourceId: id,
      newValue: {
        claimNumber: claim.claimNumber,
        certifiedAmount,
        retentionRate,
        retentionAmount,
        netCertifiedAmount,
        recoveryAmount,
        cumulativeRecovered,
      },
      source: 'api',
    });

    await invalidateAnalytics(this.cache);

    return certified;
  }

  async listProgressClaims(query: ListProgressClaimQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.ProgressClaimWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.claimType ? { claimType: query.claimType } : {}),
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