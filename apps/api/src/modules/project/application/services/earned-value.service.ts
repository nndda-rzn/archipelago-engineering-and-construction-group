import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ActualCostCalculator } from '@/shared/project/actual-cost.calculator';
import { classifyHealth } from '@/shared/project/project-health.classifier';

@Injectable()
export class EarnedValueService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActualCostCalculator) private readonly actualCost: ActualCostCalculator,
  ) {}

  async earnedValue(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });

    const pvAgg = await this.prisma.controlAccount.aggregate({ where: { projectId }, _sum: { plannedValue: true } });
    const pv = Number(pvAgg._sum?.plannedValue ?? 0);

    const budgetAgg = await this.prisma.budgetItem.aggregate({ where: { projectId, status: 'PUBLISHED' }, _sum: { amount: true } });
    const bac = Number(budgetAgg._sum?.amount ?? 0);

    const wpAgg = await this.prisma.workPackageProgress.groupBy({ by: ['workPackageId'], _max: { physicalProgress: true } });
    const wpIds = wpAgg.map((r) => r.workPackageId);
    const wps = wpIds.length ? await this.prisma.constructionWorkPackage.findMany({ where: { id: { in: wpIds }, projectId } }) : [];
    const wpByProject = new Set(wps.map((w) => w.id));
    const progresses = wpAgg.filter((r) => wpByProject.has(r.workPackageId));
    const totalProgress = progresses.reduce((s, r) => s + Number(r._max.physicalProgress ?? 0), 0);
    const avgProgress = progresses.length ? totalProgress / progresses.length : 0;
    const progressPercent = Math.min(avgProgress, 100);

    const ev = bac * (progressPercent / 100);
    const ac = await this.actualCost.compute(projectId);

    const round = (n: number) => Math.round(n * 100) / 100;
    /**
     * Tanpa BAC tidak ada dasar menilai biaya. Sebelumnya `ac > 0` saja, sehingga
     * proyek tanpa anggaran menghasilkan `ev/ac = 0` dan ditampilkan sebagai
     * "CPI 0,00 — 100% lebih mahal". Proyek tanpa anggaran tidak bisa dinilai
     * lebih mahal; ia tidak punya pembanding. Karena itu `null`, bukan nol.
     */
    const cpi = bac > 0 && ac > 0 ? ev / ac : null;
    const spi = pv > 0 ? ev / pv : null;
    const cv = ev - ac;
    const sv = ev - pv;

    // Kesehatan dinilai dari CPI x SPI, bukan dari penyerapan biaya.
    const utilization = bac > 0 ? (ac / bac) * 100 : null;
    const { health, partial } = classifyHealth(cpi, spi, utilization);

    return {
      projectId,
      projectCode: project.code,
      metrics: {
        pv: round(pv), ev: round(ev), ac: round(ac), bac: round(bac),
        progressPercent: round(progressPercent),
        cpi: cpi != null ? round(cpi) : null,
        spi: spi != null ? round(spi) : null,
        cv: round(cv), sv: round(sv),
      },
      interpretation: {
        cpi: cpi == null ? 'N/A' : cpi >= 1 ? 'ON_BUDGET' : 'OVER_BUDGET',
        spi: spi == null ? 'N/A' : spi >= 1 ? 'ON_SCHEDULE' : 'BEHIND_SCHEDULE',
        health,
        /** True bila SPI tidak tersedia sehingga status hanya dari CPI. */
        partial,
        utilization: utilization != null ? round(utilization) : null,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
