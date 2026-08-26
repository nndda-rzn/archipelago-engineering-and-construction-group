import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateProgressDto, CreateWorkPackageDto, ListWorkPackageQueryDto } from '../../presentation/dto/construction.dto';

@Injectable()
export class WorkPackageService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async findAll(projectId: string, query: ListWorkPackageQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.ConstructionWorkPackageWhereInput = {
      projectId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.constructionWorkPackage.findMany({
        where,
        include: {
          wbsItem: { select: { code: true, name: true } },
          progress: { orderBy: { progressDate: 'desc' }, take: 1, select: { physicalProgress: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.constructionWorkPackage.count({ where }),
    ]);

    return {
      items: items.map((wp) => ({
        ...wp,
        wbs: wp.wbsItem,
        latestProgress: wp.progress[0]?.physicalProgress ?? null,
        progress: undefined,
        wbsItem: undefined,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async create(projectId: string, dto: CreateWorkPackageDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
    if (!wbs || wbs.projectId !== projectId) {
      throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS tidak ditemukan di project ini' });
    }

    const seq = await this.prisma.$transaction(async (tx) => {
      const s = await tx.numberSequence.upsert({
        where: { code: 'WP' },
        update: { nextNumber: { increment: 1 } },
        create: { code: 'WP', prefix: `WP-${new Date().getFullYear()}-EPC-`, nextNumber: 2 },
      });
      return `${s.prefix}${String(s.nextNumber - 1).padStart(6, '0')}`;
    });

    const wp = await this.prisma.constructionWorkPackage.create({
      data: {
        wpNumber: seq,
        projectId,
        wbsItemId: dto.wbsItemId,
        title: dto.title,
        description: dto.description ?? null,
        scope: dto.scope ?? null,
        plannedQty: dto.plannedQty,
        unit: dto.unit ?? 'EA',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        requiresIFC: dto.requiresIFC ?? false,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'WorkPackage.CREATE',
      resource: 'ConstructionWorkPackage',
      resourceId: wp.id,
      newValue: { wpNumber: wp.wpNumber, projectId, wbs: wbs.code, title: wp.title },
      source: 'api',
    });

    return wp;
  }

  async start(id: string, actorId: string) {
    const wp = await this.prisma.constructionWorkPackage.findUnique({ where: { id } });
    if (!wp) throw new NotFoundException({ code: 'WP_NOT_FOUND', message: 'Work package tidak ditemukan' });
    if (wp.status !== 'DRAFT') {
      throw new ConflictException({ code: 'WP_NOT_DRAFT', message: `Hanya DRAFT yang bisa dimulai (${wp.status})` });
    }

    // FR-CON-002: readiness gate — WP wajib IFC tidak boleh mulai tanpa current IFC
    if (wp.requiresIFC) {
      const ifcCount = await this.prisma.drawing.count({ where: { projectId: wp.projectId, isIFC: true } });
      if (ifcCount === 0) {
        await this.prisma.constructionWorkPackage.update({
          where: { id },
          data: { readyStatus: 'BLOCKED', readyNote: 'Current IFC belum tersedia (FR-CON-002)' },
        });
        throw new ConflictException({ code: 'READINESS_GATE_BLOCKED', message: 'Work package butuh current IFC — belum tersedia (FR-CON-002)' });
      }
    }

    const updated = await this.prisma.constructionWorkPackage.update({
      where: { id },
      data: { status: 'IN_PROGRESS', readyStatus: 'READY', readyNote: 'Prerequisite terpenuhi' },
    });

    await this.audit.record({
      userId: actorId,
      action: 'WorkPackage.START',
      resource: 'ConstructionWorkPackage',
      resourceId: id,
      newValue: { wpNumber: wp.wpNumber, readyStatus: 'READY' },
      source: 'api',
    });

    return updated;
  }

  // FR-CON-002: readiness check — status gate tanpa start
  async readiness(id: string) {
    const wp = await this.prisma.constructionWorkPackage.findUnique({ where: { id } });
    if (!wp) throw new NotFoundException({ code: 'WP_NOT_FOUND', message: 'Work package tidak ditemukan' });

    const ifcCount = await this.prisma.drawing.count({ where: { projectId: wp.projectId, isIFC: true } });
    const ready = !wp.requiresIFC || ifcCount > 0;

    const updated = await this.prisma.constructionWorkPackage.update({
      where: { id },
      data: {
        readyStatus: ready ? 'READY' : 'BLOCKED',
        readyNote: ready ? 'Prerequisite terpenuhi' : 'Current IFC belum tersedia (FR-CON-002)',
      },
    });

    return { wpId: id, wpNumber: wp.wpNumber, requiresIFC: wp.requiresIFC, currentIfcCount: ifcCount, ready, readyStatus: updated.readyStatus };
  }

  async complete(id: string, actorId: string) {
    const wp = await this.prisma.constructionWorkPackage.findUnique({ where: { id } });
    if (!wp) throw new NotFoundException({ code: 'WP_NOT_FOUND', message: 'Work package tidak ditemukan' });
    if (wp.status === 'DRAFT' || wp.status === 'CANCELLED') {
      throw new ConflictException({ code: 'WP_NOT_IN_PROGRESS', message: `Work package harus IN_PROGRESS (${wp.status})` });
    }

    const updated = await this.prisma.constructionWorkPackage.update({
      where: { id },
      data: { status: 'COMPLETED', endDate: new Date() },
    });

    await this.audit.record({
      userId: actorId,
      action: 'WorkPackage.COMPLETE',
      resource: 'ConstructionWorkPackage',
      resourceId: id,
      newValue: { wpNumber: wp.wpNumber },
      source: 'api',
    });

    return updated;
  }

  async addProgress(id: string, dto: CreateProgressDto, actorId: string) {
    const wp = await this.prisma.constructionWorkPackage.findUnique({ where: { id } });
    if (!wp) throw new NotFoundException({ code: 'WP_NOT_FOUND', message: 'Work package tidak ditemukan' });
    if (wp.status === 'DRAFT') {
      throw new ConflictException({ code: 'WP_NOT_STARTED', message: 'Work package harus IN_PROGRESS sebelum catat progress' });
    }

    // Guard progress monotonik tidak naik (physicalProgress kumulatif tidak boleh turun)
    const latest = await this.prisma.workPackageProgress.findFirst({
      where: { workPackageId: id },
      orderBy: { progressDate: 'desc' },
    });
    if (latest && Number(dto.physicalProgress) < Number(latest.physicalProgress)) {
      throw new ConflictException({
        code: 'PROGRESS_REGRESSION',
        message: `Progress tidak boleh turun dari ${latest.physicalProgress}% (kumulatif)`,
      });
    }

    const progress = await this.prisma.workPackageProgress.create({
      data: {
        workPackageId: id,
        physicalProgress: dto.physicalProgress,
        achievedQty: dto.achievedQty,
        note: dto.note ?? null,
        measuredBy: dto.measuredBy,
        progressDate: dto.progressDate ? new Date(dto.progressDate) : new Date(),
      },
    });

    // Auto-complete bila mencapai 100%
    if (Number(dto.physicalProgress) >= 100 && wp.status === 'IN_PROGRESS') {
      await this.prisma.constructionWorkPackage.update({ where: { id }, data: { status: 'COMPLETED' } });
    }

    await this.audit.record({
      userId: actorId,
      action: 'WorkPackage.PROGRESS',
      resource: 'WorkPackageProgress',
      resourceId: progress.id,
      newValue: { wpNumber: wp.wpNumber, physicalProgress: dto.physicalProgress, achievedQty: dto.achievedQty },
      source: 'api',
    });

    return progress;
  }
}
