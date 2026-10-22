import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  budgetStatementSchema,
  freezeBaselineSchema,
  openRevisionSchema,
  type BudgetStatement,
  type FreezeBaseline,
  type OpenRevision,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const budgetKeys = {
  all: (projectId: string) => ['projects', projectId, 'budget'] as const,
  baseline: (projectId: string) => ['projects', projectId, 'budget', 'baseline'] as const,
};

export function useBudget(projectId: string) {
  return useQuery({
    queryKey: budgetKeys.all(projectId),
    queryFn: async () => {
      const data = await getJson<unknown>(`/projects/${projectId}/budget`);
      return budgetStatementSchema.parse(data) as BudgetStatement;
    },
    enabled: !!projectId,
  });
}

export function useBudgetBaseline(projectId: string) {
  return useQuery({
    queryKey: budgetKeys.baseline(projectId),
    queryFn: () => getJson<unknown>(`/projects/${projectId}/budget/baseline`),
    enabled: !!projectId,
  });
}

export function useUpsertBudget(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...budgetKeys.all(projectId), 'upsert'],
    mutationFn: async (input: { wbsItemId: string; costType: string; amount: number }) => {
      return postJson<unknown>(`/projects/${projectId}/budget/items`, input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all(projectId) }),
  });
}

/**
 * Membekukan budget berjalan menjadi baseline. Menggantikan `usePublishBudget`:
 * `POST /publish` kini alias dari freeze, jadi halaman hanya perlu satu konsep.
 */
export function useFreezeBaseline(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...budgetKeys.all(projectId), 'freeze'],
    mutationFn: async (input: FreezeBaseline) => {
      const parsed = freezeBaselineSchema.parse(input);
      return postJson<unknown>(`/projects/${projectId}/budget/baseline/freeze`, parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all(projectId) });
      void queryClient.invalidateQueries({ queryKey: budgetKeys.baseline(projectId) });
    },
  });
}

export function useOpenRevision(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...budgetKeys.all(projectId), 'revision'],
    mutationFn: async (input: OpenRevision) => {
      const parsed = openRevisionSchema.parse(input);
      return postJson<unknown>(`/projects/${projectId}/budget/baseline/revision`, parsed);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all(projectId) });
      void queryClient.invalidateQueries({ queryKey: budgetKeys.baseline(projectId) });
    },
  });
}
