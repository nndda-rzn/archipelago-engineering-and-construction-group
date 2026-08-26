import { useQuery } from '@tanstack/react-query';
import { executiveDashboardSchema, anomalyListSchema, cashFlowSchema, agingSchema, projectCostSummarySchema } from '@aec/api-contracts';
import { getJson } from '@/shared/lib/http';

export const analyticsKeys = {
  all: ['analytics'] as const,
  executive: ['analytics-executive'] as const,
  anomalies: ['analytics-anomalies'] as const,
  cashFlow: ['analytics-cash-flow'] as const,
  aging: ['analytics-aging'] as const,
  costSummary: ['analytics-cost-summary'] as const,
};

export function useExecutiveDashboard() {
  return useQuery({
    queryKey: analyticsKeys.executive,
    queryFn: async () => {
      const data = await getJson<unknown>('/analytics/executive');
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

export function useCashFlow() {
  return useQuery({
    queryKey: analyticsKeys.cashFlow,
    queryFn: async () => {
      const data = await getJson<unknown>('/analytics/cash-flow');
      return cashFlowSchema.parse(data);
    },
  });
}

export function useAging() {
  return useQuery({
    queryKey: analyticsKeys.aging,
    queryFn: async () => {
      const data = await getJson<unknown>('/analytics/aging');
      return agingSchema.parse(data);
    },
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
