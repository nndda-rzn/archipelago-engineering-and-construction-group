import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ActualCostCalculator } from '@/shared/project/actual-cost.calculator';
import { PortfolioEvmCalculator } from '@/shared/project/portfolio-evm.calculator';

interface PortfolioEvmFilter {
  legalEntityId?: string;
}

/**
 * Rollup EVM lintas proyek (Fase B). Perhitungan per-proyek didelegasikan ke
 * `PortfolioEvmCalculator` (shared/global) supaya matematika yang sama dapat dipakai
 * lintas modul (mis. ControlTowerService).
 *
 * CPI/SPI/TCPI hanya bermakna bila ada baseline PV (`hasEvm = pv > 0`); tanpa baseline,
 * rasio dikembalikan `null` dan EAC jatuh kembali ke BAC — tidak ada Infinity.
 */
@Injectable()
export class PortfolioEvmService {
  private readonly calculator: PortfolioEvmCalculator;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ActualCostCalculator) private readonly actualCost: ActualCostCalculator,
  ) {
    this.calculator = new PortfolioEvmCalculator(prisma, actualCost);
  }

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
    const rollups = await this.calculator.computeBatch(projectIds);

    const items = projects.map((p) => {
      const r = rollups.get(p.id);
      return {
        projectId: p.id,
        projectCode: p.code,
        projectName: p.name,
        bac: r?.bac ?? 0,
        ev: r?.ev ?? 0,
        pv: r?.pv ?? 0,
        ac: r?.ac ?? 0,
        cpi: r?.cpi ?? null,
        spi: r?.spi ?? null,
        eac: r?.eac ?? 0,
        vac: r?.vac ?? 0,
        tcpi: r?.tcpi ?? null,
        progressPercent: r?.progressPercent ?? 0,
        hasEvm: r?.hasEvm ?? false,
      };
    });

    return {
      items,
      totals: this.calculator.computeTotals(items),
      generatedAt: new Date().toISOString(),
    };
  }
}
