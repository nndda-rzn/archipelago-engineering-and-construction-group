import type { CacheService } from './cache.service';

/**
 * Key cache analytics (dibaca AnalyticsService, TTL 30-60s).
 * Satu sumber kebenaran: penulis (analytics.service) dan invalidator (service mutasi) memakai konstanta ini.
 */
export const ANALYTICS_CACHE_KEYS = {
  executive: 'analytics:executive',
  anomalies: 'analytics:anomalies',
  cashFlow: 'analytics:cash-flow',
  aging: 'analytics:aging',
  projectCostSummary: 'analytics:project-cost-summary',
} as const;

export const ANALYTICS_CACHE_KEY_VALUES = Object.values(ANALYTICS_CACHE_KEYS);

/**
 * Hapus seluruh cache analytics. Dipanggil dari service yang mengubah input salah satu key
 * (transisi status POSTED/PAID/PUBLISHED/CERTIFIED/CLOSED/RESOLVED/DONE, dsb).
 *
 * Coarse by design: kelima key murah dihitung ulang (query agregat + TTL pendek), jadi
 * akurasi didahulukan atas invalasi selektif yang gampang bocor satu key.
 */
export async function invalidateAnalytics(cache: CacheService): Promise<void> {
  await Promise.all(ANALYTICS_CACHE_KEY_VALUES.map((key) => cache.del(key)));
}
