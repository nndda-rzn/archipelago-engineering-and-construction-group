import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import type { AnalyticsFilterParams, ControlTower, Decomposition, ExecutiveDashboard, TrendSeries } from '@aec/api-contracts';
import { computeDelta, monthlySeries } from './shared/analytics-metrics';
import { ExecutiveAnalyticsService } from './executive-analytics.service';
import { FinancialAnalyticsService } from './financial-analytics.service';
import { ProjectAnalyticsService } from './project-analytics.service';
import { AnalyticsExportService } from './analytics-export.service';
import { ControlTowerService } from './control-tower.service';
import { TrendSeriesService, type TrendSeriesInput } from './trend-series.service';
import { DecompositionService, type DecompositionInput } from './decomposition.service';

export type { AgingDetail } from './financial-analytics.service';

/**
 * Permukaan publik analytics untuk controller. Ini **facade**: executive/
 * operasional didelegasikan ke `ExecutiveAnalyticsService`, keuangan ke
 * `FinancialAnalyticsService`, biaya proyek ke `ProjectAnalyticsService`, dan
 * CSV ke `AnalyticsExportService`. Controller tidak berubah.
 *
 * `computeDelta`/`monthlySeries` tetap diekspos karena dipakai lintas layer
 * (mis. proyeksi portfolio) — kini hanya mendelegasikan ke helper murni.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(ExecutiveAnalyticsService) private readonly executiveSvc: ExecutiveAnalyticsService,
    @Inject(FinancialAnalyticsService) private readonly financial: FinancialAnalyticsService,
    @Inject(ProjectAnalyticsService) private readonly project: ProjectAnalyticsService,
    @Inject(AnalyticsExportService) private readonly exporter: AnalyticsExportService,
    @Inject(ControlTowerService) private readonly controlTowerSvc: ControlTowerService,
    @Inject(TrendSeriesService) private readonly trendSeriesSvc: TrendSeriesService,
    @Inject(DecompositionService) private readonly decompositionSvc: DecompositionService,
  ) {}

  /** Delta metrik periode ini vs periode sebelumnya. `pctChange` null bila pembanding 0. */
  computeDelta(
    current: number,
    previous: number,
  ): { current: number; previous: number; pctChange: number | null; direction: 'up' | 'down' | 'flat' } {
    return computeDelta(current, previous);
  }

  /**
   * Kelompokkan baris bertimestamp menjadi seri bulanan (6 bulan terakhir, termasuk
   * bulan berjalan). Bulan tanpa baris diisi 0 supaya grafik tidak "melebar" palsu.
   * `value` boleh jumlah baris (default 1 per baris) atau nilai numerik yang disediakan.
   *
   * PENTING: ini mengukur **aliran** (berapa banyak dibuat/bulan), bukan **stok**
   * (berapa banyak terbuka saat itu). Label UI harus mencerminkan itu.
   */
  monthlySeries(rows: { at: Date; value?: number }[], now: Date = new Date(), months = 6): { month: string; value: number }[] {
    return monthlySeries(rows, now, months);
  }

  executive(filter: AnalyticsFilterParams = {}, compare?: 'previous'): Promise<ExecutiveDashboard> {
    return this.executiveSvc.executive(filter, compare);
  }

  signals(filter: AnalyticsFilterParams = {}) {
    return this.executiveSvc.signals(filter);
  }

  anomalies() {
    return this.executiveSvc.anomalies();
  }

  cashFlow(filter: AnalyticsFilterParams = {}) {
    return this.financial.cashFlow(filter);
  }

  aging(filter: AnalyticsFilterParams = {}) {
    return this.financial.aging(filter);
  }

  arConcentration(filter: AnalyticsFilterParams = {}) {
    return this.financial.arConcentration(filter);
  }

  forecastVsActual(filter: AnalyticsFilterParams = {}) {
    return this.financial.forecastVsActual(filter);
  }

  costComposition(filter: AnalyticsFilterParams = {}) {
    return this.project.costComposition(filter);
  }

  projectCostSummary(filter: AnalyticsFilterParams = {}) {
    return this.project.projectCostSummary(filter);
  }

  /** Control Tower (FR-DASH-003): payload komposit untuk dashboard `/`. */
  controlTower(filter: AnalyticsFilterParams = {}): Promise<ControlTower> {
    return this.controlTowerSvc.controlTower(filter);
  }

  /** Seri waktu satu metrik + overlay periode pembanding (workspace analitis). */
  trendSeries(input: TrendSeriesInput): Promise<TrendSeries> {
    return this.trendSeriesSvc.series(input);
  }

  /** Dekomposisi kontribusi metrik per dimensi (workspace analitis). */
  decomposition(input: DecompositionInput): Promise<Decomposition> {
    return this.decompositionSvc.decomposition(input);
  }

  exportAgingCsv(filter: AnalyticsFilterParams = {}): Promise<Readable> {
    return this.exporter.exportAgingCsv(filter);
  }

  exportCashFlowCsv(filter: AnalyticsFilterParams = {}): Promise<Readable> {
    return this.exporter.exportCashFlowCsv(filter);
  }

  exportProjectCostSummaryCsv(filter: AnalyticsFilterParams = {}): Promise<Readable> {
    return this.exporter.exportProjectCostSummaryCsv(filter);
  }
}
