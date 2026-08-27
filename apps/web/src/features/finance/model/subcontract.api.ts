import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSubcontractProgressSchema, createSubcontractSchema, subcontractProgressSchema, subcontractSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const subcontractKeys = {
  all: ['subcontracts'] as const,
  list: (params: object) => [...subcontractKeys.all, 'list', params] as const,
  progress: (id: string, params: object) => [...subcontractKeys.all, 'progress', id, params] as const,
};

export function useSubcontracts(params: { page: number; pageSize: number; status?: string }) {
  return useQuery({
    queryKey: subcontractKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.status) qs.set('status', params.status);
      const data = await getJson<{ items: unknown; total: number }>(`/subcontracts?${qs}`);
      return { items: subcontractSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateSubcontract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      projectId: string;
      vendor: string;
      title: string;
      description?: string;
      contractValue: number;
      currency?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const parsed = createSubcontractSchema.parse(input);
      return postJson<unknown>('/subcontracts', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: subcontractKeys.all }),
  });
}

export function useSubcontractProgress(id: string, params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: subcontractKeys.progress(id, params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/subcontracts/${id}/progress?${qs}`);
      return { items: subcontractProgressSchema.array().parse(data.items), total: data.total };
    },
    enabled: Boolean(id),
  });
}

export function useCreateSubcontractProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { subcontractId: string; period?: string; progressPercent: number; remark?: string }) => {
      const parsed = createSubcontractProgressSchema.parse(input);
      return postJson<unknown>(`/subcontracts/${input.subcontractId}/progress`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: subcontractKeys.all }),
  });
}

export function useVerifySubcontractProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subcontractId, progressId }: { subcontractId: string; progressId: string }) =>
      postJson<unknown>(`/subcontracts/${subcontractId}/progress/${progressId}/verify`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: subcontractKeys.all }),
  });
}

export function useRejectSubcontractProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subcontractId, progressId }: { subcontractId: string; progressId: string }) =>
      postJson<unknown>(`/subcontracts/${subcontractId}/progress/${progressId}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: subcontractKeys.all }),
  });
}
