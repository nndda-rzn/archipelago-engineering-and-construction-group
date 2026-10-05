import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ActualCostCalculator } from '@/shared/project/actual-cost.calculator';

interface PortfolioEvmFilter {
  legalEntityId?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Rollup EVM lintas proyek (Fase B). Per proyek: BAC dari budget PUBLISHED, PV dari
 * ControlAccount.plannedValue, AC dari ActualCostCalculator, EV = BAC × progress fisik.
 *
 * CPI/SPI/TCPI hanya bermakna bila ada baseline PV (`hasEvm = pv > 0`); tanpa baseline,
 * rasio dikembalikan `null` dan EAC jatuh kembali ke BAC — tidak ada Infinity.
 */
@Injectable()
export class PortfolioEvmService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActualCostCalculator) private readonly actualCost: ActualCostCalculator,
  ) {}

  async portfolioEvm(filter: PortfolioEvmFilter = {}) {
    const projects = await this.prisma.project.findMany({
      where: filter.legalEntityId ? { legalEntityId: filter.legalEntityId } : {},
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });

    if (projects.length === 0) {
      return {
        items: [],
        totals: { bac: 0, ev: 0, pv: 0, ac: 0, cpi: null, spi: null, eac: 0, vac: 0 },
        generatedAt: new Date().toISOString(),
      };
    }

    const projectIds = projects.map((p) => p.id);

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

    let bacTotal = 0;
    let evTotal = 0;
    let pvTotal = 0;
    let acTotal = 0;

    const items = projects.map((p) => {
      const bac = round2(bacByProject.get(p.id) ?? 0);
      const pv = round2(pvByProject.get(p.id) ?? 0);
      const ac = round2(acMap.get(p.id) ?? 0);
      const prog = progressByProject.get(p.id);
      const progressPercent = prog && prog.count > 0 ? round2(Math.min(prog.sum / prog.count, 100)) : 0;
      const ev = round2(bac * (progressPercent / 100));

      const hasEvm = pv > 0;
      const cpi = hasEvm && ac > 0 ? round4(ev / ac) : null;
      const spi = hasEvm ? round4(ev / pv) : null;
      const eac = cpi != null && cpi > 0 ? round2(bac / cpi) : bac;
      const vac = round2(bac - eac);
      const tcpi = hasEvm && bac - ac > 0 ? round4((bac - ev) / (bac - ac)) : null;

      bacTotal += bac;
      evTotal += ev;
      pvTotal += pv;
      acTotal += ac;

      return {
        projectId: p.id,
        projectCode: p.code,
        projectName: p.name,
        bac,
        ev,
        pv,
        ac,
        cpi,
        spi,
        eac,
        vac,
        tcpi,
        progressPercent,
        hasEvm,
      };
    });

    const totalsCpi = acTotal > 0 ? round4(evTotal / acTotal) : null;
    const totalsSpi = pvTotal > 0 ? round4(evTotal / pvTotal) : null;
    const totalsEac = totalsCpi != null && totalsCpi > 0 ? round2(bacTotal / totalsCpi) : round2(bacTotal);

    return {
      items,
      totals: {
        bac: round2(bacTotal),
        ev: round2(evTotal),
        pv: round2(pvTotal),
        ac: round2(acTotal),
        cpi: totalsCpi,
        spi: totalsSpi,
        eac: totalsEac,
        vac: round2(bacTotal - totalsEac),
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
