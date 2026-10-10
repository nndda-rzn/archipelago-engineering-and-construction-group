import { useQuery } from '@tanstack/react-query';
import { executiveDashboardSchema, anomalyListSchema, cashFlowSchema, agingSchema, projectCostSummarySchema, pendingApprovalCountSchema, signalListSchema, costCompositionSchema, arConcentrationSchema, forecastVsActualSchema, controlTowerSchema, trendSeriesSchema, decompositionSchema } from '@aec/api-contracts';
import { getJson, downloadFile } from '@/shared/lib/http';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';

export const analyticsKeys = {
  all: ['analytics'] as const,
  executive: (filter: DashboardFilter = {}, compare?: 'previous') => ['analytics-executive', filter, compare ?? null] as const,
  anomalies: ['analytics-anomalies'] as const,
  signals: (filter: DashboardFilter = {}) => ['analytics-signals', filter] as const,
  cashFlow: (filter: DashboardFilter = {}) => ['analytics-cash-flow', filter] as const,
  aging: (filter: DashboardFilter = {}) => ['analytics-aging', filter] as const,
  costSummary: ['analytics-cost-summary'] as const,
  pendingApprovals: ['approvals', 'pending-count'] as const,
  trendSeries: (params: { metric: string; bucket: 'month' | 'quarter' }, filter: DashboardFilter = {}) =>
    ['analytics-trend-series', params, filter] as const,
  decomposition: (params: { metric: string; dimension: string; limit?: number }, filter: DashboardFilter = {}) =>
    ['analytics-decomposition', params, filter] as const,
};

/** Bangun query string dari filter (entity + rentang tanggal), mengabaikan nilai kosong. */
function filterQuery(filter: DashboardFilter, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (filter.legalEntityId) params.set('legalEntityId', filter.legalEntityId);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useExecutiveDashboard(filter: DashboardFilter = {}, opts?: { compare?: 'previous' }) {
  const compare = opts?.compare;
  return useQuery({
    queryKey: analyticsKeys.executive(filter, compare),
    queryFn: async () => {
      const data = await getJson<unknown>(`/analytics/executive${filterQuery(filter, compare ? { compare } : undefined)}`);
      return executiveDashboardSchema.parse(data);
    },
  });
}

export function useSignals(filter: DashboardFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.signals(filter),
    queryFn: async () => signalListSchema.parse(await getJson<unknown>(`/analytics/signals${filterQuery(filter)}`)),
    refetchInterval: 30000,
  });
}

export function useAnomalies() {
  return useQuery({
    queryKey: analyticsKeys.anomalies,
    queryFn: async () => {
      const data = await getJson<unknown>('/analytics/anomalies');
      return anomalyListSchema.parse(data);
    },
  });
}

export function useCashFlow(filter: DashboardFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.cashFlow(filter),
    queryFn: async () => {
      const data = await getJson<unknown>(`/analytics/cash-flow${filterQuery(filter)}`);
      return cashFlowSchema.parse(data);
    },
  });
}

export function useAging(filter: DashboardFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.aging(filter),
    queryFn: async () => {
      // Aging menghormati entity DAN rentang tanggal (basis `invoiceDate`).
      const data = await getJson<unknown>(`/analytics/aging${filterQuery(filter)}`);
      return agingSchema.parse(data);
    },
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: analyticsKeys.pendingApprovals,
    queryFn: async () => pendingApprovalCountSchema.parse(await getJson<unknown>('/approvals/pending-count')),
    refetchInterval: 30000,
  });
}

export function useProjectCostSummary(filter: DashboardFilter = {}) {
  return useQuery({
    queryKey: [...analyticsKeys.costSummary, filter] as const,
    queryFn: async () => {
      const data = await getJson<unknown>(`/analytics/project-cost-summary${filterQuery(filter)}`);
      return projectCostSummarySchema.parse(data);
    },
  });
}

export function useCostComposition(filter: DashboardFilter = {}) {
  return useQuery({
    queryKey: ['analytics-cost-composition', filter] as const,
    queryFn: async () => costCompositionSchema.parse(await getJson<unknown>(`/analytics/cost-composition${filterQuery(filter)}`)),
  });
}

export function useArConcentration(filter: DashboardFilter = {}) {
  return useQuery({
    queryKey: ['analytics-ar-concentration', filter] as const,
    queryFn: async () => arConcentrationSchema.parse(await getJson<unknown>(`/analytics/ar-concentration${filterQuery(filter)}`)),
  });
}

export function useForecastVsActual(filter: DashboardFilter = {}) {
  return useQuery({
    queryKey: ['analytics-forecast-vs-actual', filter] as const,
    queryFn: async () => forecastVsActualSchema.parse(await getJson<unknown>(`/analytics/forecast-vs-actual${filterQuery(filter)}`)),
  });
}

/**
 * Control Tower (FR-DASH-003): satu payload komposit untuk dashboard `/`.
 * Refetch interval ringan (60s) sebagai jaring pengaman; pembaruan utama datang
 * dari SSE change-feed (`useLiveAnalytics`) yang meng-invalidate key ini.
 */
export function useControlTower(filter: DashboardFilter = {}) {
  return useQuery({
    queryKey: ['analytics-control-tower', filter] as const,
    queryFn: async () => controlTowerSchema.parse(await getJson<unknown>(`/analytics/control-tower${filterQuery(filter)}`)),
    refetchInterval: 60_000,
  });
}

/** Seri tren satu metrik + overlay periode pembanding (workspace analitis). */
export function useTrendSeries(
  params: { metric: string; bucket?: 'month' | 'quarter'; compare?: 'previous' },
  filter: DashboardFilter = {},
) {
  const bucket = params.bucket ?? 'month';
  return useQuery({
    queryKey: analyticsKeys.trendSeries({ metric: params.metric, bucket }, filter),
    queryFn: async () =>
      trendSeriesSchema.parse(
        await getJson<unknown>(
          `/analytics/trend-series${filterQuery(filter, {
            metric: params.metric,
            bucket,
            ...(params.compare ? { compare: params.compare } : {}),
          })}`,
        ),
      ),
  });
}

/** Dekomposisi kontribusi satu metrik per dimensi (workspace analitis). */
export function useDecomposition(
  params: { metric: string; dimension: string; limit?: number; compare?: 'previous' },
  filter: DashboardFilter = {},
) {
  return useQuery({
    queryKey: analyticsKeys.decomposition({ metric: params.metric, dimension: params.dimension, limit: params.limit }, filter),
    queryFn: async () =>
      decompositionSchema.parse(
        await getJson<unknown>(
          `/analytics/decomposition${filterQuery(filter, {
            metric: params.metric,
            dimension: params.dimension,
            ...(params.limit ? { limit: String(params.limit) } : {}),
            ...(params.compare ? { compare: params.compare } : {}),
          })}`,
        ),
      ),
  });
}

/**
 * Unduh CSV server-side yang MENGIKUTI filter aktif — sebelumnya CSV selalu
 * berisi seluruh data sehingga tidak cocok dengan yang tampil di layar.
 */
export const exportAnalytics = {
  aging: (filter: DashboardFilter = {}) => downloadFile(`/analytics/aging/export.csv${filterQuery(filter)}`, 'aging-ar-ap.csv'),
  cashFlow: (filter: DashboardFilter = {}) => downloadFile(`/analytics/cash-flow/export.csv${filterQuery(filter)}`, 'cash-flow.csv'),
  projectCostSummary: (filter: DashboardFilter = {}) => downloadFile(`/analytics/project-cost-summary/export.csv${filterQuery(filter)}`, 'project-cost-summary.csv'),
};
