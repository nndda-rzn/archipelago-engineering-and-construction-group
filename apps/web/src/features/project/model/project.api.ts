import { useQuery } from '@tanstack/react-query';
import { portfolioSchema, projectHealthSchema, type Portfolio, type ProjectHealth } from '@aec/api-contracts';
import { getJson } from '@/shared/lib/http';
import type { DashboardFilter } from '@/shared/lib/dashboard-period';

export const projectAnalyticsKeys = {
  all: ['projects', 'analytics'] as const,
  health: (projectId: string) => [...projectAnalyticsKeys.all, 'health', projectId] as const,
  portfolio: (filter: DashboardFilter = {}) => [...projectAnalyticsKeys.all, 'portfolio', filter] as const,
};

export function useProjectHealth(projectId: string) {
  return useQuery({
    queryKey: projectAnalyticsKeys.health(projectId),
    queryFn: async () => {
      const data = await getJson<unknown>(`/projects/${projectId}/health`);
      return projectHealthSchema.parse(data);
    },
    enabled: !!projectId,
  });
}

export function usePortfolio(filter: DashboardFilter = {}) {
  return useQuery({
    queryKey: projectAnalyticsKeys.portfolio(filter),
    queryFn: async () => {
      const qs = filter.legalEntityId ? `?legalEntityId=${encodeURIComponent(filter.legalEntityId)}` : '';
      const data = await getJson<unknown>(`/projects/portfolio${qs}`);
      return portfolioSchema.parse(data);
    },
  });
}
export type { Portfolio, ProjectHealth };
