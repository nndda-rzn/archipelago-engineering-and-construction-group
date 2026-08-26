import { useQuery } from '@tanstack/react-query';
import { executiveDashboardSchema, anomalyListSchema } from '@aec/api-contracts';
import { getJson } from '@/shared/lib/http';

export const analyticsKeys = {
  all: ['analytics'] as const,
  executive: ['analytics-executive'] as const,
  anomalies: ['analytics-anomalies'] as const,
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
