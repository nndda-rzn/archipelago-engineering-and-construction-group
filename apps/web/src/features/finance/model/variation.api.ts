import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createVariationSchema, variationSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const variationKeys = { all: ['variations'] as const, list: (params: PaginationParams & { projectId?: string; status?: string }) => [...variationKeys.all, 'list', params] as const };

export function useVariations(params: PaginationParams & { projectId?: string; status?: string }) {
  return useQuery({
    queryKey: variationKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.projectId) qs.set('projectId', params.projectId);
      if (params.status) qs.set('status', params.status);
      const data = await getJson<{ items: unknown; total: number }>(`/variations?${qs}`);
      return { items: variationSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      projectId: string;
      title: string;
      description?: string;
      type?: string;
      amountChange: number;
      scheduleImpactDays?: number;
    }) => {
      const parsed = createVariationSchema.parse(input);
      return postJson<unknown>('/variations', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: variationKeys.all }),
  });
}

export function useApproveVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => postJson<unknown>(`/variations/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: variationKeys.all }),
  });
}

export function useRejectVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => postJson<unknown>(`/variations/${id}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: variationKeys.all }),
  });
}
