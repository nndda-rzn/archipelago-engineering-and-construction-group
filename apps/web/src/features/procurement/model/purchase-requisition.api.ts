import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPrSchema, purchaseRequisitionSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const prKeys = { all: ['pr'] as const, list: (params: PaginationParams) => [...prKeys.all, 'list', params] as const };

export function usePrs(params: PaginationParams) {
  return useQuery({
    queryKey: prKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/purchase-requisitions?${qs}`);
      return { items: purchaseRequisitionSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreatePr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { projectId: string; wbsItemId?: string; requestedBy: string; description?: string; items: { description: string; quantity: number; unit?: string; estimatedUnitPrice?: number }[] }) => {
      const parsed = createPrSchema.parse(input);
      return postJson<unknown>('/purchase-requisitions', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: prKeys.all }),
  });
}