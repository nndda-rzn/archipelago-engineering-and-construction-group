import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { CreateProjectDto, ListProjectQueryDto } from '../../presentation/dto/project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async findAll(query: ListProjectQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 50, 200);

    const where: Prisma.ProjectWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { client: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { legalEntity: { select: { code: true, legalName: true } } },
    });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });
    return project;
  }

  async create(dto: CreateProjectDto, actorId: string) {
    const existing = await this.prisma.project.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException({ code: 'PROJECT_EXISTS', message: 'Kode project sudah digunakan' });

    const project = await this.prisma.project.create({
      data: {
        code: dto.code,
        name: dto.name,
        client: dto.client,
        legalEntityId: dto.legalEntityId,
        businessUnit: dto.businessUnit ?? null,
        location: dto.location ?? null,
        currency: dto.currency ?? 'IDR',
        contractValue: dto.contractValue ?? null,
        advanceAmount: dto.advanceAmount ?? null,
        advanceRecoveryRate: dto.advanceRecoveryRate ?? 0,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        completionDate: dto.completionDate ? new Date(dto.completionDate) : null,
        director: dto.director ?? null,
        manager: dto.manager ?? null,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'PROJECT.CREATE',
      resource: 'Project',
      resourceId: project.id,
      newValue: { code: project.code, name: project.name, client: project.client },
      source: 'api',
    });

    return project;
  }
}
