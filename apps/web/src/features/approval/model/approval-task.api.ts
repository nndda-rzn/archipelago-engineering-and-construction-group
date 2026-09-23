import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approvalTaskSchema, type ApprovalTask, type ApproveTask, type SubmitForApproval } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const approvalTaskKeys = {
  all: ['approvals'] as const,
  tasks: (params?: { page: number; pageSize: number }) => [...approvalTaskKeys.all, 'tasks', params ?? {}] as const,
};

export function useApprovalTasks(params?: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: approvalTaskKeys.tasks(params),
    queryFn: async () => {
      const qs = params ? `?page=${params.page}&pageSize=${params.pageSize}` : '';
      const data = await getJson<{ items: unknown; total: number }>(`/approvals${qs}`);
      return {
        items: approvalTaskSchema.array().parse(data.items),
        total: data.total,
      };
    },
    refetchInterval: 15000,
    placeholderData: (prev) => prev,
  });
}

export function useSubmitForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitForApproval) => postJson<unknown>('/approvals/submit', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalTaskKeys.all }),
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ApproveTask) => postJson<unknown>('/approvals/decide', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalTaskKeys.all }),
  });
}

export type { ApprovalTask };
