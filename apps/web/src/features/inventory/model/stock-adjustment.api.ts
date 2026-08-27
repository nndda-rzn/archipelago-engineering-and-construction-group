import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStockAdjustmentSchema, stockAdjustmentSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const adjKeys = { all: ['stock-adjustments'] as const, list: (params: object) => [...adjKeys.all, 'list', params] as const };

export function useStockAdjustments(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: adjKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/stock-adjustments?${qs}`);
      return { items: stockAdjustmentSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; warehouseId: string; reasonCode: string; reason?: string; items: { description: string; quantity: number; unit?: string; wbsItemId?: string }[] }) => {
      const parsed = createStockAdjustmentSchema.parse(input);
      return postJson<unknown>('/stock-adjustments', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adjKeys.all }),
  });
}

export function useApproveStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/stock-adjustments/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: adjKeys.all }),
  });
}