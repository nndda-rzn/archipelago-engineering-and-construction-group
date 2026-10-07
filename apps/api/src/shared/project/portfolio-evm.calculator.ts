import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ActualCostCalculator } from '@/shared/project/actual-cost.calculator';

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export interface EvmRollup {
  bac: number;
  ev: number;
  pv: number;
  ac: number;
  cpi: number | null;
  spi: number | null;
  eac: number;
  vac: number;
  tcpi: number | null;
  progressPercent: number;
  hasEvm: boolean;
}

export interface EvmTotals {
  bac: number;
  ev: number;
  pv: number;
  ac: number;
  cpi: number | null;
  spi: number | null;
  eac: number;
  vac: number;
}

/**
 * Rollup EVM per proyek. BAC dari budget PUBLISHED, PV dari ControlAccount.plannedValue,
 * AC dari ActualCostCalculator, EV = BAC × progress fisik.
 *
 * CPI/SPI/TCPI hanya bermakna bila ada baseline PV (`hasEvm = pv > 0`); tanpa baseline,
 * rasio dikembalikan `null` dan EAC jatuh kembali ke BAC — tidak ada Infinity.
 */
@Injectable()
export class PortfolioEvmCalculator {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActualCostCalculator) private readonly actualCost: ActualCostCalculator,
  ) {}

  async computeBatch(projectIds: string[]): Promise<Map<string, EvmRollup>> {
    const result = new Map<string, EvmRollup>();
    if (projectIds.length === 0) return result;

    const [bacGroups, pvGroups, acMap] = await Promise.all([
      this.prisma.budgetItem.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, status: 'PUBLISHED' },
        _sum: { amount: true },
      }),
      this.prisma.controlAccount.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds } },
        _sum: { plannedValue: true },
      }),
      this.actualCost.computeBatch(projectIds),
    ]);

    const bacByProject = new Map(bacGroups.map((r) => [r.projectId, Number(r._sum?.amount ?? 0)]));
    const pvByProject = new Map(pvGroups.map((r) => [r.projectId, Number(r._sum?.plannedValue ?? 0)]));

    // Progress fisik: rata-rata `_max physicalProgress` per work package, per proyek.
    const wpAgg = await this.prisma.workPackageProgress.groupBy({ by: ['workPackageId'], _max: { physicalProgress: true } });
    const wpIds = wpAgg.map((r) => r.workPackageId);
    const workPackages = wpIds.length
      ? await this.prisma.constructionWorkPackage.findMany({
          where: { id: { in: wpIds }, projectId: { in: projectIds } },
          select: { id: true, projectId: true },
        })
      : [];
    const wpProject = new Map(workPackages.map((w) => [w.id, w.projectId]));
    const progressByProject = new Map<string, { sum: number; count: number }>();
    for (const r of wpAgg) {
      const projectId = wpProject.get(r.workPackageId);
      if (!projectId) continue;
      const cur = progressByProject.get(projectId) ?? { sum: 0, count: 0 };
      cur.sum += Number(r._max.physicalProgress ?? 0);
      cur.count += 1;
      progressByProject.set(projectId, cur);
    }

    for (const projectId of projectIds) {
      const bac = round2(bacByProject.get(projectId) ?? 0);
      const pv = round2(pvByProject.get(projectId) ?? 0);
      const ac = round2(acMap.get(projectId) ?? 0);
      const prog = progressByProject.get(projectId);
      const progressPercent = prog && prog.count > 0 ? round2(Math.min(prog.sum / prog.count, 100)) : 0;
      const ev = round2(bac * (progressPercent / 100));

      const hasEvm = pv > 0;
      const cpi = hasEvm && ac > 0 ? round4(ev / ac) : null;
      const spi = hasEvm ? round4(ev / pv) : null;
      const eac = cpi != null && cpi > 0 ? round2(bac / cpi) : bac;
      const vac = round2(bac - eac);
      const tcpi = hasEvm && bac - ac > 0 ? round4((bac - ev) / (bac - ac)) : null;

      result.set(projectId, { bac, ev, pv, ac, cpi, spi, eac, vac, tcpi, progressPercent, hasEvm });
    }

    return result;
  }

  computeTotals(rollups: EvmRollup[]): EvmTotals {
    let bacTotal = 0;
    let evTotal = 0;
    let pvTotal = 0;
    let acTotal = 0;
    for (const r of rollups) {
      bacTotal += r.bac;
      evTotal += r.ev;
      pvTotal += r.pv;
      acTotal += r.ac;
    }

    const cpi = pvTotal > 0 && acTotal > 0 ? round4(evTotal / acTotal) : null;
    const spi = pvTotal > 0 ? round4(evTotal / pvTotal) : null;
    const eac = cpi != null && cpi > 0 ? round2(bacTotal / cpi) : round2(bacTotal);

    return {
      bac: round2(bacTotal),
      ev: round2(evTotal),
      pv: round2(pvTotal),
      ac: round2(acTotal),
      cpi,
      spi,
      eac,
      vac: round2(bacTotal - eac),
    };
  }
}
