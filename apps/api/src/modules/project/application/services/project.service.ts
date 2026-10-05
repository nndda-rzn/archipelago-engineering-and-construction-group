import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PROJECT_SORT_FIELDS, type ProjectRegister, type ProjectSortField } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import { ActualCostCalculator } from '@/shared/project/actual-cost.calculator';
import { classifyHealth } from '@/shared/project/project-health.classifier';
import type { CreateProjectDto, ListProjectQueryDto } from '../../presentation/dto/project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CacheService) private readonly cache: CacheService,
    @Inject(ActualCostCalculator) private readonly actualCost: ActualCostCalculator,
  ) {}

  /**
   * Register proyek: satu payload berisi metadata proyek + metrik biaya + health,
   * dipakai bersama oleh daftar (tabel/kartu/timeline) dan ringkasan.
   *
   * `sort`/`order` di-whitelist: kolom di luar `PROJECT_SORT_FIELDS` diabaikan dan
   * jatuh ke `createdAt desc` — mencegah kolom liar / error 500.
   */
  async register(query: { sort?: string; order?: string } = {}): Promise<ProjectRegister> {
    const sortField = (PROJECT_SORT_FIELDS as readonly string[]).includes(query.sort ?? '')
      ? (query.sort as ProjectSortField)
      : 'createdAt';
    const sortOrder: Prisma.SortOrder = query.order === 'asc' ? 'asc' : 'desc';

    const projects = await this.prisma.project.findMany({
      select: {
        id: true, code: true, name: true, client: true, manager: true, status: true,
        contractValue: true, startDate: true, completionDate: true,
      },
      orderBy: { [sortField]: sortOrder },
    });

    if (projects.length === 0) {
      return {
        items: [],
        totals: { projectCount: 0, totalContract: 0, totalBudget: 0, totalActual: 0, totalVariance: 0 },
        healthCounts: { NO_BUDGET: 0, ON_TRACK: 0, AT_RISK: 0, CRITICAL: 0 },
        generatedAt: new Date().toISOString(),
      };
    }

    const projectIds = projects.map((p) => p.id);
    const [budgetGroups, actualMap] = await Promise.all([
      this.prisma.budgetItem.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, status: 'PUBLISHED' },
        _sum: { amount: true },
      }),
      this.actualCost.computeBatch(projectIds),
    ]);
    const budgetMap = new Map(budgetGroups.map((r) => [r.projectId, Number(r._sum?.amount ?? 0)]));

    let totalContract = 0;
    let totalBudget = 0;
    let totalActual = 0;
    const healthCounts = { NO_BUDGET: 0, ON_TRACK: 0, AT_RISK: 0, CRITICAL: 0 };

    const items = projects.map((p) => {
      const budget = budgetMap.get(p.id) ?? 0;
      const actual = actualMap.get(p.id) ?? 0;
      const { utilization, health } = classifyHealth(budget, actual);
      healthCounts[health] += 1;
      totalContract += Number(p.contractValue ?? 0);
      totalBudget += budget;
      totalActual += actual;
      return {
        projectId: p.id,
        code: p.code,
        name: p.name,
        client: p.client,
        manager: p.manager,
        status: p.status,
        contractValue: Number(p.contractValue ?? 0),
        startDate: p.startDate ? p.startDate.toISOString() : null,
        completionDate: p.completionDate ? p.completionDate.toISOString() : null,
        budget,
        actual,
        variance: budget - actual,
        utilization: utilization != null ? Math.round(utilization * 10) / 10 : null,
        health,
      };
    });

    return {
      items,
      totals: { projectCount: projects.length, totalContract, totalBudget, totalActual, totalVariance: totalBudget - totalActual },
      healthCounts,
      generatedAt: new Date().toISOString(),
    };
  }

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
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    return project;
  }

  async create(dto: CreateProjectDto, actorId: string) {
    const existing = await this.prisma.project.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException({ code: 'PROJECT_EXISTS', message: 'Project code already in use' });

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

    await invalidateAnalytics(this.cache);

    return project;
  }
}
