import { useQuery } from '@tanstack/react-query';
import { executiveDashboardSchema, anomalyListSchema, cashFlowSchema, agingSchema, projectCostSummarySchema, pendingApprovalCountSchema } from '@aec/api-contracts';
import { getJson, downloadFile } from '@/shared/lib/http';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';

export const analyticsKeys = {
  all: ['analytics'] as const,
  executive: (filter: DashboardFilter = {}) => ['analytics-executive', filter] as const,
  anomalies: ['analytics-anomalies'] as const,
  cashFlow: (filter: DashboardFilter = {}) => ['analytics-cash-flow', filter] as const,
  aging: (filter: DashboardFilter = {}) => ['analytics-aging', filter] as const,
  costSummary: ['analytics-cost-summary'] as const,
  pendingApprovals: ['approvals', 'pending-count'] as const,
};

/** Bangun query string dari filter (entity + rentang tanggal), mengabaikan nilai kosong. */
function filterQuery(filter: DashboardFilter): string {
  const params = new URLSearchParams();
  if (filter.legalEntityId) params.set('legalEntityId', filter.legalEntityId);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useExecutiveDashboard(filter: DashboardFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.executive(filter),
    queryFn: async () => {
      const data = await getJson<unknown>(`/analytics/executive${filterQuery(filter)}`);
      return executiveDashboardSchema.parse(data);
    },
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
      const params = new URLSearchParams();
      if (filter.legalEntityId) params.set('legalEntityId', filter.legalEntityId);
      const qs = params.toString();
      const data = await getJson<unknown>(`/analytics/aging${qs ? `?${qs}` : ''}`);
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

export function useProjectCostSummary() {
  return useQuery({
    queryKey: analyticsKeys.costSummary,
    queryFn: async () => {
      const data = await getJson<unknown>('/analytics/project-cost-summary');
      return projectCostSummarySchema.parse(data);
    },
  });
}

/** Unduh CSV server-side (seluruh data, bukan hanya halaman aktif di layar). */
export const exportAnalytics = {
  aging: () => downloadFile('/analytics/aging/export.csv', 'aging-ar-ap.csv'),
  cashFlow: () => downloadFile('/analytics/cash-flow/export.csv', 'cash-flow.csv'),
  projectCostSummary: () => downloadFile('/analytics/project-cost-summary/export.csv', 'project-cost-summary.csv'),
};
