import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchaseOrderSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const poKeys = { all: ['po'] as const, list: (params: object) => [...poKeys.all, 'list', params] as const };

export function usePos(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: poKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/purchase-orders?${qs}`);
      return { items: purchaseOrderSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreatePo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { requisitionId: string; vendor: string; currency?: string }) =>
      postJson<unknown>('/purchase-orders', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: poKeys.all }),
  });
}

export function useReleasePo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/purchase-orders/${id}/release`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: poKeys.all }),
  });
}