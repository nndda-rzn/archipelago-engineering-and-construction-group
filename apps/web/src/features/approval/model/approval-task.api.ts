import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approvalDetailSchema,
  approvalQueueSchema,
  bulkDecideResponseSchema,
  type ApprovalDetail,
  type ApprovalQueue,
  type ApproveTask,
  type BulkDecide,
  type SubmitForApproval,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export interface ApprovalQueueParams {
  status?: string;
  type?: string;
  q?: string;
  mine?: boolean;
  page: number;
  pageSize: number;
}

export const approvalTaskKeys = {
  all: ['approvals'] as const,
  tasks: (params?: ApprovalQueueParams) => [...approvalTaskKeys.all, 'tasks', params ?? {}] as const,
  detail: (id: string) => [...approvalTaskKeys.all, 'detail', id] as const,
};

function toQueryString(params: ApprovalQueueParams): string {
  const search = new URLSearchParams();
  search.set('page', String(params.page));
  search.set('pageSize', String(params.pageSize));
  if (params.status && params.status !== 'ALL') search.set('status', params.status);
  if (params.type) search.set('type', params.type);
  if (params.q) search.set('q', params.q);
  if (params.mine) search.set('mine', 'true');
  return search.toString();
}

export function useApprovalQueue(params: ApprovalQueueParams) {
  return useQuery({
    queryKey: approvalTaskKeys.tasks(params),
    queryFn: async (): Promise<ApprovalQueue> => {
      const data = await getJson<unknown>(`/approvals?${toQueryString(params)}`);
      return approvalQueueSchema.parse(data);
    },
    refetchInterval: 15000,
    placeholderData: (prev) => prev,
  });
}

export function useApprovalDetail(id: string | null) {
  return useQuery({
    queryKey: approvalTaskKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<ApprovalDetail> => {
      const data = await getJson<unknown>(`/approvals/${id}`);
      return approvalDetailSchema.parse(data);
    },
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

export function useBulkDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkDecide) => postJson<unknown>('/approvals/bulk-decide', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalTaskKeys.all }),
  });
}

export { bulkDecideResponseSchema };
export type { ApprovalDetail, ApprovalQueue };
