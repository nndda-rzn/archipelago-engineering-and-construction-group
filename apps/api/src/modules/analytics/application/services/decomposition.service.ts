import { Inject, Injectable } from '@nestjs/common';
import type { Decomposition } from '@aec/api-contracts';
import { PrismaService } from '@/shared/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { analyticsCacheKey } from '@/shared/cache/analytics-cache';
import { resolveDateRange } from '@/shared/utils/date-range';
import { computeDelta } from './shared/analytics-metrics';
import type { DimensionKey, MetricKey, MetricRow } from './shared/metric-registry';
import { MetricRegistry } from './shared/metric-registry.provider';

export interface DecompositionInput {
  metric: MetricKey;
  dimension: DimensionKey;
  legalEntityId?: string;
  from?: string;
  to?: string;
  limit?: number;
  compare?: 'previous';
}

const DEFAULT_LIMIT = 10;

/**
 * Dekomposisi kontribusi: menjelaskan **kenapa** sebuah metrik bergerak, per
 * dimensi (entity/proyek/tipe biaya/klien). Top-N kontributor + `others` (sisa)
 * supaya Σ items + others = total selalu rekonsiliasi — angka tak pernah
 * "hilang" dari tampilan.
 */
@Injectable()
export class DecompositionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
    @Inject(MetricRegistry) private readonly registry: MetricRegistry,
  ) {}

  async decomposition(input: DecompositionInput): Promise<Decomposition> {
    const limit = input.limit && input.limit > 0 ? input.limit : DEFAULT_LIMIT;
    const key = analyticsCacheKey(`analytics:decomposition:${input.metric}:${input.dimension}:${limit}`, input);
    return this.cache.wrap(key, 60, async () => {
      const { from, to } = resolveDateRange(input.from, input.to);
      const rows = await this.registry.resolveRows(input.metric, input.dimension, this.prisma, { legalEntityId: input.legalEntityId, from, to });
      const grouped = this.group(rows);
      const total = this.round(grouped.reduce((s, g) => s + g.value, 0));

      const items = grouped.slice(0, limit).map((g) => ({
        key: g.key,
        label: g.label,
        value: this.round(g.value),
        share: total !== 0 ? Math.round((g.value / total) * 10000) / 10000 : 0,
      }));
      const othersValue = this.round(grouped.slice(limit).reduce((s, g) => s + g.value, 0));

      const result: Decomposition = {
        metric: input.metric,
        dimension: input.dimension,
        items,
        total,
        others: { value: othersValue },
        generatedAt: new Date().toISOString(),
      };

      if (input.compare === 'previous') {
        const { from: prevFrom, to: prevTo } = this.shiftBack(from, to);
        const prevRows = await this.registry.resolveRows(input.metric, input.dimension, this.prisma, { legalEntityId: input.legalEntityId, from: prevFrom, to: prevTo });
        const prevGrouped = new Map(this.group(prevRows).map((g) => [g.key, g.value]));
        const prevTotal = this.round([...prevGrouped.values()].reduce((s, v) => s + v, 0));
        result.previousTotal = prevTotal;
        result.items = items.map((item) => {
          const previousValue = this.round(prevGrouped.get(item.key) ?? 0);
          return { ...item, previousValue, delta: computeDelta(item.value, previousValue) };
        });
        const othersPrev = this.round(grouped.slice(limit).reduce((s, g) => s + (prevGrouped.get(g.key) ?? 0), 0));
        result.others = { value: othersValue, previousValue: othersPrev };
      }

      return result;
    }) as Promise<Decomposition>;
  }

  /** Kelompokkan baris per `key` (jumlah nilai, label pertama menang), urut menurun. */
  private group(rows: MetricRow[]): { key: string; label: string; value: number }[] {
    const map = new Map<string, { key: string; label: string; value: number }>();
    for (const row of rows) {
      const cur = map.get(row.key);
      if (cur) cur.value += row.value;
      else map.set(row.key, { key: row.key, label: row.label, value: row.value });
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }

  /** Geser rentang mundur sepanjang durasinya — untuk pembanding periode lalu. */
  private shiftBack(from?: Date, to?: Date): { from: Date; to: Date } {
    const now = new Date();
    const end = to ?? now;
    const start = from ?? new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));
    const spanMs = end.getTime() - start.getTime();
    const prevTo = new Date(start.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - spanMs);
    return { from: prevFrom, to: prevTo };
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
