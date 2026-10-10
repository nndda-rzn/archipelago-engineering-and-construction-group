import { Inject, Injectable } from '@nestjs/common';
import type { TrendSeries } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { analyticsCacheKey } from '@/shared/cache/analytics-cache';
import { resolveDateRange } from '@/shared/utils/date-range';
import { computeDelta } from './shared/analytics-metrics';
import { bucketOf, periodsBetween, type PeriodBucket } from './shared/period-bucket';
import { METRICS, type MetricKey } from './shared/metric-registry';
import { MetricRegistry } from './shared/metric-registry.provider';

export interface TrendSeriesInput {
  metric: MetricKey;
  legalEntityId?: string;
  from?: string;
  to?: string;
  bucket?: PeriodBucket;
  compare?: 'previous';
}

/**
 * Seri waktu satu metrik + overlay periode pembanding. Menjawab "bagaimana
 * pergerakannya" — melengkapi Control Tower (`/`) yang menjawab "apa posisi
 * sekarang". Semua periode dalam rentang selalu muncul (0 bila kosong) supaya
 * bentuk grafik stabil; `compare=previous` menambah seri rentang sebelumnya.
 */
@Injectable()
export class TrendSeriesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
    @Inject(MetricRegistry) private readonly registry: MetricRegistry,
  ) {}

  async series(input: TrendSeriesInput): Promise<TrendSeries> {
    const bucket: PeriodBucket = input.bucket ?? 'month';
    const key = analyticsCacheKey(`analytics:trend-series:${input.metric}:${bucket}`, input);
    return this.cache.wrap(key, 60, async () => {
      const { from, to } = this.resolveRange(input);
      const metric = METRICS[input.metric];

      const rows = await this.registry.resolveRows(input.metric, 'project', this.prisma, { legalEntityId: input.legalEntityId, from, to });
      const points = this.bucketRows(rows, periodsBetween(from, to, bucket), bucket);
      const total = this.round(points.reduce((s, p) => s + p.value, 0));

      const result: TrendSeries = {
        metric: input.metric,
        unit: metric.unit,
        bucket,
        points,
        total,
        generatedAt: new Date().toISOString(),
      };

      if (input.compare === 'previous') {
        const { from: prevFrom, to: prevTo } = this.shiftBack(from, to);
        const prevRows = await this.registry.resolveRows(input.metric, 'project', this.prisma, { legalEntityId: input.legalEntityId, from: prevFrom, to: prevTo });
        const comparePoints = this.bucketRows(prevRows, periodsBetween(prevFrom, prevTo, bucket), bucket).slice(0, points.length);
        const compareTotal = this.round(comparePoints.reduce((s, p) => s + p.value, 0));
        result.comparePoints = comparePoints;
        result.compareTotal = compareTotal;
        result.delta = computeDelta(total, compareTotal);
      }

      return result;
    }) as Promise<TrendSeries>;
  }

  /** Rentang tanggal efektif: dari filter, atau 12 bulan terakhir bila kosong. */
  private resolveRange(input: TrendSeriesInput): { from: Date; to: Date } {
    const { from, to } = resolveDateRange(input.from, input.to);
    if (from && to) return { from, to };
    const now = new Date();
    const end = to ?? now;
    const start = from ?? new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));
    return { from: start, to: end };
  }

  /** Geser rentang mundur sepanjang durasinya — untuk pembanding periode lalu. */
  private shiftBack(from: Date, to: Date): { from: Date; to: Date } {
    const spanMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - spanMs);
    return { from: prevFrom, to: prevTo };
  }

  /** Jumlahkan baris ke tiap periode; periode tanpa baris tetap 0. */
  private bucketRows(rows: { date: Date; value: number }[], periods: string[], bucket: PeriodBucket): { period: string; value: number }[] {
    const sums = new Map<string, number>(periods.map((p) => [p, 0]));
    for (const row of rows) {
      const k = bucketOf(row.date, bucket);
      if (sums.has(k)) sums.set(k, (sums.get(k) ?? 0) + row.value);
    }
    return periods.map((period) => ({ period, value: this.round(sums.get(period) ?? 0) }));
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
