import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type {
  CreateSubcontractDto, CreateSubcontractProgressDto, ListSubcontractQueryDto, ListSubcontractProgressQueryDto,
} from '../../presentation/dto/finance.dto';

@Injectable()
export class SubcontractService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createSubcontract(dto: CreateSubcontractDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'SC' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'SC', prefix: `SC-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const subcon = await this.prisma.subcontract.create({
      data: {
        subconNumber: seq,
        projectId: dto.projectId,
        vendor: dto.vendor,
        title: dto.title,
        description: dto.description ?? null,
        contractValue: Number(dto.contractValue),
        currency: dto.currency ?? 'IDR',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        createdBy: actorId,
      },
      include: { project: { select: { code: true, name: true } } },
    });

    await this.audit.record({
      userId: actorId,
      action: 'Subcontract.CREATE',
      resource: 'Subcontract',
      resourceId: subcon.id,
      newValue: { subconNumber: seq, vendor: dto.vendor, contractValue: Number(dto.contractValue) },
      source: 'api',
    });

    return subcon;
  }

  async createProgress(dto: CreateSubcontractProgressDto, actorId: string) {
    const subcon = await this.prisma.subcontract.findUnique({ where: { id: dto.subcontractId } });
    if (!subcon) throw new NotFoundException({ code: 'SUBCON_NOT_FOUND', message: 'Subcontract tidak ditemukan' });
    if (subcon.status === 'COMPLETED' || subcon.status === 'TERMINATED') {
      throw new ConflictException({ code: 'SUBCON_INACTIVE', message: `Subcontract ${subcon.status} — tidak bisa progress` });
    }

    const progressPercent = Number(dto.progressPercent);
    if (progressPercent > 100) throw new BadRequestException({ code: 'INVALID_PROGRESS', message: 'Progress maksimal 100%' });

    // FR-CMR-008 + anti-regresi: progress baru harus di atas progress tertinggi (SUBMITTED/VERIFIED)
    const last = await this.prisma.subcontractProgress.findFirst({
      where: { subcontractId: subcon.id, status: { in: ['SUBMITTED', 'VERIFIED'] } },
      orderBy: { progressPercent: 'desc' },
      select: { progressPercent: true },
    });
    if (last && progressPercent <= Number(last.progressPercent)) {
      throw new ConflictException({ code: 'PROGRESS_REGRESSION', message: `Progress harus di atas progress tertinggi (${last.progressPercent}%)` });
    }

    const verifiedAmount = Math.round(Number(subcon.contractValue) * progressPercent) / 100;

    const entry = await this.prisma.subcontractProgress.create({
      data: {
        subcontractId: subcon.id,
        period: dto.period ?? null,
        progressDate: dto.progressDate ? new Date(dto.progressDate) : new Date(),
        progressPercent,
        verifiedAmount,
        remark: dto.remark ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'SubcontractProgress.SUBMIT',
      resource: 'SubcontractProgress',
      resourceId: entry.id,
      newValue: { subcontractId: subcon.id, progressPercent, verifiedAmount },
      source: 'api',
    });

    return entry;
  }

  async verifyProgress(subcontractId: string, progressId: string, actorId: string) {
    const entry = await this.prisma.subcontractProgress.findUnique({ where: { id: progressId } });
    if (!entry || entry.subcontractId !== subcontractId) {
      throw new NotFoundException({ code: 'PROGRESS_NOT_FOUND', message: 'Progress entry tidak ditemukan' });
    }
    if (entry.status !== 'SUBMITTED') {
      throw new ConflictException({ code: 'NOT_SUBMITTED', message: `Hanya SUBMITTED yang bisa diverifikasi (${entry.status})` });
    }

    const verified = await this.prisma.subcontractProgress.update({
      where: { id: progressId },
      data: { status: 'VERIFIED', verifiedBy: actorId, verifiedAt: new Date() },
    });

    await this.audit.record({
      userId: actorId,
      action: 'SubcontractProgress.VERIFY',
      resource: 'SubcontractProgress',
      resourceId: progressId,
      newValue: { subcontractId, progressPercent: Number(entry.progressPercent), verifiedAmount: Number(entry.verifiedAmount) },
      source: 'api',
    });

    return verified;
  }

  async rejectProgress(subcontractId: string, progressId: string, actorId: string) {
    const entry = await this.prisma.subcontractProgress.findUnique({ where: { id: progressId } });
    if (!entry || entry.subcontractId !== subcontractId) {
      throw new NotFoundException({ code: 'PROGRESS_NOT_FOUND', message: 'Progress entry tidak ditemukan' });
    }
    if (entry.status !== 'SUBMITTED') {
      throw new ConflictException({ code: 'NOT_SUBMITTED', message: `Hanya SUBMITTED yang bisa ditolak (${entry.status})` });
    }

    const rejected = await this.prisma.subcontractProgress.update({
      where: { id: progressId },
      data: { status: 'REJECTED', remark: null },
    });

    await this.audit.record({
      userId: actorId,
      action: 'SubcontractProgress.REJECT',
      resource: 'SubcontractProgress',
      resourceId: progressId,
      newValue: { subcontractId, progressPercent: Number(entry.progressPercent) },
      source: 'api',
    });

    return rejected;
  }

  async listSubcontracts(query: ListSubcontractQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.SubcontractWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.subcontract.findMany({
        where,
        include: { project: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.subcontract.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async listProgress(subcontractId: string, query: ListSubcontractProgressQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.SubcontractProgressWhereInput = {
      subcontractId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.subcontractProgress.findMany({
        where,
        orderBy: { progressDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.subcontractProgress.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
