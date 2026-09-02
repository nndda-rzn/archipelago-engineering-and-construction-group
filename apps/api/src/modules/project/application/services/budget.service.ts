import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import type { PublishBudgetDto, UpsertBudgetItemDto } from '../../presentation/dto/budget.dto';

@Injectable()
export class BudgetService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async findAll(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const items = await this.prisma.budgetItem.findMany({
      where: { projectId },
      include: { wbsItem: { select: { code: true, name: true } } },
      orderBy: [{ version: 'desc' }],
    });

    const byWbs = new Map<string, { amount: number; count: number }>();
    for (const item of items) {
      const current = byWbs.get(item.wbsItemId) ?? { amount: 0, count: 0 };
      current.amount += Number(item.amount);
      current.count += 1;
      byWbs.set(item.wbsItemId, current);
    }

    const wbsItems = await this.prisma.wbsItem.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    return {
      projectId,
      status: items.some((i) => i.status === 'PUBLISHED') ? 'PUBLISHED' : 'DRAFT',
      wbs: wbsItems.map((w) => ({
        id: w.id,
        code: w.code,
        name: w.name,
        parentId: w.parentId,
        budget: byWbs.get(w.id)?.amount ?? 0,
        itemCount: byWbs.get(w.id)?.count ?? 0,
      })),
      totalBudget: [...byWbs.values()].reduce((sum, v) => sum + v.amount, 0),
    };
  }

  async upsert(projectId: string, dto: UpsertBudgetItemDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
    if (!wbs || wbs.projectId !== projectId) {
      throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS tidak ditemukan di project ini' });
    }

    const costType = dto.costType ?? 'DIRECT';

    const existing = await this.prisma.budgetItem.findUnique({
      where: { projectId_wbsItemId_costType: { projectId, wbsItemId: dto.wbsItemId, costType } },
    });
    if (existing?.status === 'PUBLISHED') {
      throw new ConflictException({ code: 'BUDGET_PUBLISHED', message: 'Budget sudah publish — gunakan versi baru' });
    }

    const item = await this.prisma.budgetItem.upsert({
      where: { projectId_wbsItemId_costType: { projectId, wbsItemId: dto.wbsItemId, costType } },
      update: { amount: dto.amount },
      create: { projectId, wbsItemId: dto.wbsItemId, costType, amount: dto.amount },
    });

    await this.audit.record({
      userId: actorId,
      action: 'BUDGET.UPSERT',
      resource: 'BudgetItem',
      resourceId: item.id,
      newValue: { projectId, wbs: wbs.code, costType, amount: dto.amount },
      source: 'api',
    });

    return item;
  }

  async publish(projectId: string, _dto: PublishBudgetDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project tidak ditemukan' });

    const draftItems = await this.prisma.budgetItem.findMany({ where: { projectId, status: 'DRAFT' } });
    if (draftItems.length === 0) {
      throw new ConflictException({ code: 'BUDGET_EMPTY', message: 'Belum ada budget untuk di-publish' });
    }

    await this.prisma.budgetItem.updateMany({
      where: { projectId, status: 'DRAFT' },
      data: { status: 'PUBLISHED', version: { increment: 1 } },
    });

    const total = draftItems.reduce((sum, i) => sum + Number(i.amount), 0);
    await this.audit.record({
      userId: actorId,
      action: 'BUDGET.PUBLISH',
      resource: 'Budget',
      resourceId: projectId,
      newValue: { projectId, items: draftItems.length, total },
      source: 'api',
    });

    return { projectId, published: draftItems.length, totalBudget: total };
  }
}
