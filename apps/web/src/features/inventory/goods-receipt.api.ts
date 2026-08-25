import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGoodsReceiptSchema, goodsReceiptSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const grKeys = { all: ['goods-receipts'] as const, list: (params: object) => [...grKeys.all, 'list', params] as const };

export function useGoodsReceipts(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: grKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/goods-receipts?${qs}`);
      return { items: goodsReceiptSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { poId: string; warehouseId: string; remark?: string; items: { poItemId: string; quantity: number; wbsItemId?: string }[] }) => {
      const parsed = createGoodsReceiptSchema.parse(input);
      return postJson<unknown>('/goods-receipts', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: grKeys.all }),
  });
}