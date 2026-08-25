import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStockTransferSchema, stockTransferSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const stKeys = { all: ['stock-transfers'] as const, list: (params: object) => [...stKeys.all, 'list', params] as const };

export function useStockTransfers(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: stKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/stock-transfers?${qs}`);
      return { items: stockTransferSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; fromWarehouseId: string; toWarehouseId: string; remark?: string; items: { description: string; quantity: number; unit?: string; wbsItemId?: string }[] }) => {
      const parsed = createStockTransferSchema.parse(input);
      return postJson<unknown>('/stock-transfers', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: stKeys.all }),
  });
}