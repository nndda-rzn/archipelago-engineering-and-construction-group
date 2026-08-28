import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createWarehouseSchema, warehouseSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const whKeys = { all: ['warehouses'] as const, list: (params: PaginationParams) => [...whKeys.all, 'list', params] as const };

export function useWarehouses(params: PaginationParams) {
  return useQuery({
    queryKey: whKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/warehouses?${qs}`);
      return { items: warehouseSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { code: string; name: string; warehouseType?: string; projectId?: string; location?: string }) => {
      const parsed = createWarehouseSchema.parse(input);
      return postJson<unknown>('/warehouses', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: whKeys.all }),
  });
}