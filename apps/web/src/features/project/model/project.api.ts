import { useQuery } from '@tanstack/react-query';
import { portfolioSchema, projectHealthSchema, type Portfolio, type ProjectHealth } from '@aec/api-contracts';
import { getJson } from '@/shared/lib/http';

export const projectAnalyticsKeys = {
  all: ['projects', 'analytics'] as const,
  health: (projectId: string) => [...projectAnalyticsKeys.all, 'health', projectId] as const,
  portfolio: () => [...projectAnalyticsKeys.all, 'portfolio'] as const,
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

export function usePortfolio() {
  return useQuery({
    queryKey: projectAnalyticsKeys.portfolio(),
    queryFn: async () => {
      const data = await getJson<unknown>('/projects/portfolio');
      return portfolioSchema.parse(data);
    },
  });
}
export type { Portfolio, ProjectHealth };
