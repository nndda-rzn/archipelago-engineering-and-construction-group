import { Injectable } from '@nestjs/common';
import type { PrismaService } from '@/shared/database/prisma.service';
import { resolveRows, type DimensionKey, type MetricKey, type MetricRow, type ResolvedFilter } from './metric-registry';

/**
 * Pembungkus injectable tipis di atas registry metrik murni. Service analitis
 * bergantung pada kelas ini (bukan fungsi modul) supaya mudah distub di test
 * dan terdaftar di DI container.
 */
@Injectable()
export class MetricRegistry {
  resolveRows(
    metric: MetricKey,
    dimension: DimensionKey,
    prisma: PrismaService,
    filter: ResolvedFilter,
  ): Promise<MetricRow[]> {
    return resolveRows(metric, dimension, prisma, filter);
  }
}
