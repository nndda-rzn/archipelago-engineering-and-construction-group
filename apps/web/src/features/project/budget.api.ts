import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { budgetSummarySchema, upsertBudgetSchema, type UpsertBudget } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const budgetKeys = {
  all: (projectId: string) => ['projects', projectId, 'budget'] as const,
};

export function useBudget(projectId: string) {
  return useQuery({
    queryKey: budgetKeys.all(projectId),
    queryFn: async () => {
      const data = await getJson<unknown>(`/projects/${projectId}/budget`);
      return budgetSummarySchema.parse(data);
    },
    enabled: !!projectId,
  });
}

export function useUpsertBudget(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...budgetKeys.all(projectId), 'upsert'],
    mutationFn: async (input: UpsertBudget) => {
      const parsed = upsertBudgetSchema.parse(input);
      return postJson<unknown>(`/projects/${projectId}/budget/items`, parsed);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all(projectId) }),
  });
}

export function usePublishBudget(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...budgetKeys.all(projectId), 'publish'],
    mutationFn: () => postJson<unknown>(`/projects/${projectId}/budget/publish`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all(projectId) }),
  });
}
