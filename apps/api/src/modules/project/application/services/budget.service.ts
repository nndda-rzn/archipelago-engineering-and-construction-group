import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { BudgetStatement, CostTypeKey } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import type { PublishBudgetDto, UpsertBudgetItemDto } from '../../presentation/dto/budget.dto';
import {
  buildStatementRows,
  collectStatementWarnings,
  costCoverage,
  reconcile,
  sumTotals,
  type StatementInput,
} from './budget-baseline';

@Injectable()
export class BudgetService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  /**
   * Pernyataan biaya satu proyek: baseline beku, revisi berjalan, komitmen,
   * biaya nyata, dan selisihnya — per WBS, ber-rollup.
   *
   * `actual` diambil dari **satu** sumber: ledger `movementType='OUT'`. Jurnal
   * akun `610*` sengaja TIDAK ditambahkan. Material issue hanya menulis ledger
   * tanpa jurnal, sedangkan jurnal 6100 berasal dari invoice vendor atas material
   * yang sama — menjumlahkan keduanya menghitung material dua kali. Di data dev,
   * itu membuat PRJ-014 kelebihan Rp 75 M. Jurnalnya tetap dibaca, tetapi hanya
   * untuk `reconciliation`, supaya kondisinya terlihat alih-alih disembunyikan.
   */
  async findAll(projectId: string): Promise<BudgetStatement> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const baseline = await this.prisma.budgetBaseline.findFirst({
      where: { projectId, status: 'FROZEN' },
      orderBy: { version: 'desc' },
    });

    const [wbsItems, budgetItems, ledgerGroups, journalGroups, pvGroups, committedGroups, baselineLines, forecast, previousBaseline] =
      await Promise.all([
        this.prisma.wbsItem.findMany({
          where: { projectId },
          select: { id: true, code: true, name: true, parentId: true },
          orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        }),
        this.prisma.budgetItem.findMany({
          where: { projectId },
          select: { wbsItemId: true, costType: true, amount: true },
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
        this.prisma.purchaseOrderItem.groupBy({
          by: ['wbsItemId'],
          where: {
            wbsItemId: { not: null },
            purchaseOrder: { is: { projectId, status: 'RELEASED' } },
          },
          _sum: { totalPrice: true },
        }),
        baseline
          ? this.prisma.budgetBaselineLine.findMany({
              where: { baselineId: baseline.id },
              select: { wbsItemId: true, costType: true, amount: true },
            })
          : Promise.resolve([]),
        this.prisma.forecast.findFirst({ where: { projectId }, orderBy: { version: 'desc' } }),
        baseline
          ? this.prisma.budgetBaseline.findFirst({
              where: { projectId, status: 'FROZEN', version: { lt: baseline.version } },
              orderBy: { version: 'desc' },
            })
          : Promise.resolve(null),
      ]);

    // `totalValue` pada ledger OUT bernilai negatif; besarnya biaya adalah nilai absolut.
    const actual = ledgerGroups
      .filter((g) => g.wbsItemId != null)
      .map((g) => ({ wbsItemId: g.wbsItemId as string, amount: Math.abs(Number(g._sum?.totalValue ?? 0)) }));

    const pvByWbs = new Map<string, number>();
    for (const g of pvGroups) {
      if (!g.wbsItemId) continue;
      pvByWbs.set(g.wbsItemId, Number(g._sum?.plannedValue ?? 0));
    }

    const input: StatementInput = {
      wbs: wbsItems,
      baseline: baselineLines.map((l) => ({
        wbsItemId: l.wbsItemId,
        costType: l.costType as CostTypeKey,
        amount: Number(l.amount),
      })),
      revised: budgetItems.map((b) => ({
        wbsItemId: b.wbsItemId,
        costType: b.costType as CostTypeKey,
        amount: Number(b.amount),
      })),
      committed: committedGroups
        .filter((g) => g.wbsItemId != null)
        .map((g) => ({ wbsItemId: g.wbsItemId as string, amount: Number(g._sum?.totalPrice ?? 0) })),
      actual,
      pvByWbs,
    };

    const rows = buildStatementRows(input);
    const totals = sumTotals(rows);
    const contractValue = Number(project.contractValue ?? 0);
    const totalPv = [...pvByWbs.values()].reduce((s, v) => s + v, 0);

    // Rekonsiliasi: jurnal 610* hanya dilaporkan, tidak dijumlahkan ke `actual`.
    const journalExpense610 = journalGroups.reduce((s, g) => s + Number(g._sum?.debit ?? 0), 0);
    const ledgerOut = actual.reduce((s, a) => s + a.amount, 0);

    const toSummary = (
      b: typeof baseline | typeof previousBaseline,
      total: number,
    ): BudgetStatement['baseline'] =>
      b
        ? {
            id: b.id,
            version: b.version,
            status: b.status as 'DRAFT' | 'FROZEN',
            label: b.label ?? null,
            reason: b.reason ?? null,
            frozenAt: b.frozenAt ? b.frozenAt.toISOString() : null,
            total,
          }
        : null;

    return {
      projectId,
      currency: (project as { currency?: string }).currency ?? 'IDR',
      baseline: toSummary(baseline, baselineLines.reduce((s, l) => s + Number(l.amount), 0)),
      // Baseline sebelumnya belum membawa barisnya di query ini; totalnya 0
      // sampai Stage B membutuhkannya untuk perbandingan antar-versi.
      previous: toSummary(previousBaseline, 0),
      rows,
      totals: {
        ...totals,
        contractValue,
        eac: forecast ? Number(forecast.estimateAtCompletion) : null,
        vac: forecast ? Number(forecast.varianceAtCompletion) : null,
      },
      // Komitmen/biaya tanpa dimensi WBS tidak dibuang diam-diam; Stage C
      // menampilkannya sebagai baris "not yet allocated".
      unallocated: { committed: 0, actual: 0 },
      reconciliation: reconcile(ledgerOut, journalExpense610),
      warnings: collectStatementWarnings({ revised: totals.revised, contractValue }, rows, totalPv),
      costCoverage: costCoverage(rows),
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
