import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStockOpnameSchema, stockOpnameSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const opnKeys = { all: ['stock-opnames'] as const, list: (params: PaginationParams) => [...opnKeys.all, 'list', params] as const };

export function useStockOpnames(params: PaginationParams) {
  return useQuery({
    queryKey: opnKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/stock-opnames?${qs}`);
      return { items: stockOpnameSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateStockOpname() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; warehouseId: string; remark?: string; items: { description: string; bookQuantity: number; actualQuantity: number; unit?: string; wbsItemId?: string }[] }) => {
      const parsed = createStockOpnameSchema.parse(input);
      return postJson<unknown>('/stock-opnames', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: opnKeys.all }),
  });
}