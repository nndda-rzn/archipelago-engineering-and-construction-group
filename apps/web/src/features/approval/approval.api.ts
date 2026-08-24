import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approvalTaskSchema, type ApproveTask, type ApprovalTask, type SubmitForApproval } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const approvalKeys = { all: ['approvals'] as const };

export function useApprovalTasks() {
  return useQuery({
    queryKey: approvalKeys.all,
    queryFn: async () => {
      const data = await getJson<{ items: unknown; total: number }>('/approvals');
      return {
        items: approvalTaskSchema.array().parse(data.items),
        total: data.total,
      };
    },
    refetchInterval: 15000,
  });
}

export function useSubmitForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitForApproval) => postJson<unknown>('/approvals/submit', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ApproveTask) => postJson<unknown>('/approvals/decide', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

export type { ApprovalTask };
