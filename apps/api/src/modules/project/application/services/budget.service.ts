import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CostTypeKey } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import type { PublishBudgetDto, UpsertBudgetItemDto } from '../../presentation/dto/budget.dto';
import { buildBudgetTree, collectWarnings, flattenTree, type BudgetNodeInput } from './budget-tree';

@Injectable()
export class BudgetService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  /**
   * Ringkasan budget satu proyek sebagai pohon WBS ber-rollup.
   *
   * Biaya terpakai (`used`) dihitung per WBS dari dua sumber yang sama dengan
   * `ActualCostCalculator`, tetapi berdimensi WBS: ledger `movementType='OUT'`
   * dan debit jurnal akun beban material (`610*`). Keduanya dijumlahkan, bukan
   * saling menggantikan.
   */
  async findAll(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const [wbsItems, budgetItems, ledgerGroups, journalGroups, pvGroups] = await Promise.all([
      this.prisma.wbsItem.findMany({
        where: { projectId },
        select: { id: true, code: true, name: true, parentId: true },
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.budgetItem.findMany({
        where: { projectId },
        select: { wbsItemId: true, costType: true, amount: true, status: true, version: true },
      }),
      this.prisma.stockLedgerEntry.groupBy({
        by: ['wbsItemId'],
        where: { projectId, movementType: 'OUT', wbsItemId: { not: null } },
        _sum: { totalValue: true },
      }),
      this.prisma.journalLine.groupBy({
        by: ['wbsItemId'],
        where: {
          wbsItemId: { not: null },
          // `Journal` tidak punya `projectId`; dimensi proyek ada di baris jurnal.
          projectId,
          journal: { is: { status: 'POSTED' } },
          account: { is: { code: { startsWith: '610' } } },
        },
        _sum: { debit: true },
      }),
      this.prisma.controlAccount.groupBy({
        by: ['wbsItemId'],
        where: { projectId },
        _sum: { plannedValue: true },
      }),
    ]);

    const nodes: BudgetNodeInput[] = wbsItems.map((w) => ({
      id: w.id,
      code: w.code,
      name: w.name,
      parentId: w.parentId,
    }));

    const rows = budgetItems.map((b) => ({
      wbsItemId: b.wbsItemId,
      costType: b.costType as CostTypeKey,
      amount: Number(b.amount),
    }));

    // Gabungkan dua sumber biaya per WBS. `totalValue` pada ledger OUT bernilai
    // negatif, jadi diambil nilai absolutnya.
    const spendByWbs = new Map<string, number>();
    for (const g of ledgerGroups) {
      if (!g.wbsItemId) continue;
      spendByWbs.set(g.wbsItemId, Math.abs(Number(g._sum?.totalValue ?? 0)));
    }
    for (const g of journalGroups) {
      if (!g.wbsItemId) continue;
      spendByWbs.set(g.wbsItemId, (spendByWbs.get(g.wbsItemId) ?? 0) + Number(g._sum?.debit ?? 0));
    }
    const spend = [...spendByWbs.entries()].map(([wbsItemId, amount]) => ({ wbsItemId, amount }));

    const pvByWbs = new Map<string, number>();
    for (const g of pvGroups) {
      if (!g.wbsItemId) continue;
      pvByWbs.set(g.wbsItemId, Number(g._sum?.plannedValue ?? 0));
    }

    const tree = buildBudgetTree(nodes, rows, spend, pvByWbs);
    const flat = flattenTree(tree);

    const totalBudget = tree.reduce((s, n) => s + n.budget, 0);
    const totalUsed = tree.reduce((s, n) => s + n.used, 0);
    const contractValue = Number(project.contractValue ?? 0);
    const totals = {
      budget: totalBudget,
      used: totalUsed,
      remaining: totalBudget - totalUsed,
      contractValue,
      variance: contractValue - totalBudget,
    };

    const totalPv = [...pvByWbs.values()].reduce((s, v) => s + v, 0);

    return {
      projectId,
      status: budgetItems.some((i) => i.status === 'PUBLISHED') ? ('PUBLISHED' as const) : ('DRAFT' as const),
      wbs: flat.map(({ children: _children, ...node }) => node),
      totalBudget,
      totals,
      warnings: collectWarnings(totals, tree, totalPv),
      costCoverage: {
        allocatedNodes: flat.filter((n) => n.used > 0).length,
        totalNodes: flat.length,
      },
    };
  }

  async upsert(projectId: string, dto: UpsertBudgetItemDto, actorId: string) {
    // `costType` wajib. Dulu opsional dan jatuh ke 'DIRECT', sehingga setiap edit
    // dari UI menambah baris kelima di samping 4 cost type yang sudah ada.
    if (!dto.costType) {
      throw new BadRequestException({ code: 'COST_TYPE_REQUIRED', message: 'costType is required' });
    }

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const wbs = await this.prisma.wbsItem.findUnique({ where: { id: dto.wbsItemId } });
    if (!wbs || wbs.projectId !== projectId) {
      throw new NotFoundException({ code: 'WBS_NOT_FOUND', message: 'WBS not found in this project' });
    }

    const costType = dto.costType;

    const existing = await this.prisma.budgetItem.findUnique({
      where: { projectId_wbsItemId_costType: { projectId, wbsItemId: dto.wbsItemId, costType } },
    });
    if (existing?.status === 'PUBLISHED') {
      throw new ConflictException({ code: 'BUDGET_PUBLISHED', message: 'Budget is already published - use a new version' });
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

    await invalidateAnalytics(this.cache);

    return item;
  }

  async publish(projectId: string, _dto: PublishBudgetDto, actorId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const draftItems = await this.prisma.budgetItem.findMany({ where: { projectId, status: 'DRAFT' } });
    if (draftItems.length === 0) {
      throw new ConflictException({ code: 'BUDGET_EMPTY', message: 'No budget to publish' });
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

    await invalidateAnalytics(this.cache);

    return { projectId, published: draftItems.length, totalBudget: total };
  }
}
