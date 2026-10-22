import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { BudgetBaselineSummary } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { AuditService } from '@/modules/foundation';
import { CacheService } from '@/shared/cache/cache.service';
import { invalidateAnalytics } from '@/shared/cache/analytics-cache';
import type { FreezeBaselineDto, OpenRevisionDto } from '../../presentation/dto/budget-baseline.dto';

/**
 * Baseline beku ber-versi.
 *
 * Kenapa tabel terpisah, bukan kolom `version` di `BudgetItem`: kolom itu berubah
 * di tempat, sehingga tidak pernah menyimpan keadaan masa lalu. Baseline harus
 * salinan yang tidak dapat diubah — itulah satu-satunya cara angka "baseline"
 * bisa dipertanggungjawabkan.
 *
 * `BudgetItem` tetap tabel kerja hidup. Saat freeze, baris hidup ditandai
 * PUBLISHED; saat revisi dibuka, ditandai DRAFT dan isinya disalin dari baseline
 * terakhir. Semantik itu menjaga 13 pembaca `status = 'PUBLISHED'` tetap benar
 * tanpa satu pun perlu diubah.
 */
@Injectable()
export class BudgetBaselineService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async findBaseline(projectId: string): Promise<{
    current: BudgetBaselineSummary | null;
    previous: BudgetBaselineSummary | null;
  }> {
    const rows = await this.prisma.budgetBaseline.findMany({
      where: { projectId, status: 'FROZEN' },
      orderBy: { version: 'desc' },
      take: 2,
      include: { lines: { select: { amount: true } } },
    });

    const toSummary = (b: (typeof rows)[number]): BudgetBaselineSummary => ({
      id: b.id,
      version: b.version,
      status: b.status as 'DRAFT' | 'FROZEN',
      label: b.label ?? null,
      reason: b.reason ?? null,
      frozenAt: b.frozenAt ? b.frozenAt.toISOString() : null,
      total: b.lines.reduce((s, l) => s + Number(l.amount), 0),
    });

    return {
      current: rows[0] ? toSummary(rows[0]) : null,
      previous: rows[1] ? toSummary(rows[1]) : null,
    };
  }

  /**
   * Bekukan budget berjalan menjadi versi FROZEN baru.
   *
   * Dua penolakan yang penting: proyek tanpa budget tidak boleh menghasilkan
   * baseline kosong (itu akan tampak seperti baseline sah bernilai 0), dan
   * freeze ganda tanpa revisi di antaranya tidak boleh menghasilkan versi
   * identik yang tidak berarti apa-apa.
   */
  async freeze(projectId: string, dto: FreezeBaselineDto, actorId: string): Promise<BudgetBaselineSummary> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const items = await this.prisma.budgetItem.findMany({ where: { projectId } });
    if (items.length === 0) {
      throw new ConflictException({ code: 'BUDGET_EMPTY', message: 'No budget to freeze' });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      /**
       * Bila ada revisi terbuka, freeze membekukan revisi ITU — bukan menolak.
       *
       * Versi pertama menolak dengan REVISION_OPEN, dan itu membuat alur revisi
       * jalan buntu: `openRevision` membuat draft, lalu `freeze` menolak
       * keberadaan draft tersebut. Persis bug "publish = jalan buntu" yang
       * seharusnya diperbaiki halaman ini.
       */
      const openDraft = await tx.budgetBaseline.findFirst({
        where: { projectId, status: 'DRAFT' },
        orderBy: { version: 'desc' },
      });

      if (openDraft) {
        // Baris draft disegarkan dari budget hidup, lalu dibekukan.
        await tx.budgetBaselineLine.deleteMany({ where: { baselineId: openDraft.id } });
        await tx.budgetBaselineLine.createMany({
          data: items.map((i) => ({
            baselineId: openDraft.id,
            wbsItemId: i.wbsItemId,
            costType: i.costType,
            amount: i.amount,
          })),
        });

        const frozen = await tx.budgetBaseline.update({
          where: { id: openDraft.id },
          data: {
            status: 'FROZEN',
            frozenAt: new Date(),
            frozenBy: actorId,
            label: dto.label ?? openDraft.label,
            reason: dto.reason ?? openDraft.reason,
          },
        });

        await tx.budgetItem.updateMany({ where: { projectId }, data: { status: 'PUBLISHED' } });
        return frozen;
      }

      const last = await tx.budgetBaseline.findFirst({ where: { projectId }, orderBy: { version: 'desc' } });
      const version = (last?.version ?? 0) + 1;

      const baseline = await tx.budgetBaseline.create({
        data: {
          projectId,
          version,
          status: 'FROZEN',
          label: dto.label ?? null,
          reason: dto.reason ?? null,
          frozenAt: new Date(),
          frozenBy: actorId,
        },
      });

      await tx.budgetBaselineLine.createMany({
        data: items.map((i) => ({
          baselineId: baseline.id,
          wbsItemId: i.wbsItemId,
          costType: i.costType,
          amount: i.amount,
        })),
      });

      // Baris hidup kembali menjadi PUBLISHED: tidak ada revisi terbuka, dan
      // pembaca lama menganggapnya sebagai angka baseline berjalan.
      await tx.budgetItem.updateMany({ where: { projectId }, data: { status: 'PUBLISHED' } });

      return baseline;
    });

    const total = items.reduce((s, i) => s + Number(i.amount), 0);

    await this.audit.record({
      userId: actorId,
      action: 'BUDGET.BASELINE_FREEZE',
      resource: 'BudgetBaseline',
      resourceId: created.id,
      newValue: { projectId, version: created.version, lines: items.length, total },
      source: 'api',
    });

    await invalidateAnalytics(this.cache);

    return {
      id: created.id,
      version: created.version,
      status: 'FROZEN',
      label: created.label ?? null,
      reason: created.reason ?? null,
      frozenAt: created.frozenAt ? created.frozenAt.toISOString() : null,
      total,
    };
  }

  /**
   * Buka revisi baru dari baseline FROZEN terakhir.
   *
   * Baris hidup diganti, bukan di-upsert: `deleteMany` lalu `createMany` membuat
   * tabel kerja persis sama dengan baseline yang direvisi. Dengan upsert, cost
   * type yang dihapus dari revisi akan tertinggal sebagai baris hantu.
   */
  async openRevision(projectId: string, dto: OpenRevisionDto, actorId: string): Promise<BudgetBaselineSummary> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const { baseline: created, total } = await this.prisma.$transaction(async (tx) => {
      const openDraft = await tx.budgetBaseline.findFirst({ where: { projectId, status: 'DRAFT' } });
      if (openDraft) {
        throw new ConflictException({ code: 'REVISION_OPEN', message: 'A revision is already open' });
      }

      const lastFrozen = await tx.budgetBaseline.findFirst({
        where: { projectId, status: 'FROZEN' },
        orderBy: { version: 'desc' },
      });
      if (!lastFrozen) {
        throw new ConflictException({ code: 'BASELINE_NOT_FOUND', message: 'No frozen baseline to revise' });
      }

      const lines = await tx.budgetBaselineLine.findMany({ where: { baselineId: lastFrozen.id } });

      const baseline = await tx.budgetBaseline.create({
        data: {
          projectId,
          version: lastFrozen.version + 1,
          status: 'DRAFT',
          label: dto.label ?? null,
          reason: dto.reason,
        },
      });

      await tx.budgetBaselineLine.createMany({
        data: lines.map((l) => ({
          baselineId: baseline.id,
          wbsItemId: l.wbsItemId,
          costType: l.costType,
          amount: l.amount,
        })),
      });

      await tx.budgetItem.deleteMany({ where: { projectId } });
      await tx.budgetItem.createMany({
        data: lines.map((l) => ({
          projectId,
          wbsItemId: l.wbsItemId,
          costType: l.costType,
          amount: l.amount,
          status: 'DRAFT',
        })),
      });

      // Total dihitung di dalam transaksi dari baris yang baru disalin, supaya
      // tidak perlu query tambahan setelah commit.
      return { baseline, total: lines.reduce((s, l) => s + Number(l.amount), 0) };
    });

    await this.audit.record({
      userId: actorId,
      action: 'BUDGET.REVISION_OPEN',
      resource: 'BudgetBaseline',
      resourceId: created.id,
      newValue: { projectId, version: created.version, reason: dto.reason, total },
      source: 'api',
    });

    await invalidateAnalytics(this.cache);

    return {
      id: created.id,
      version: created.version,
      status: 'DRAFT',
      label: created.label ?? null,
      reason: created.reason ?? null,
      frozenAt: null,
      total,
    };
  }
}
