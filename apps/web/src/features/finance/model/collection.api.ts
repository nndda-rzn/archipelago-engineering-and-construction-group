import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collectionSchema, createCollectionSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const colKeys = { all: ['collections'] as const, list: (params: PaginationParams) => [...colKeys.all, 'list', params] as const };

export function useCollections(params: PaginationParams) {
  return useQuery({
    queryKey: colKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/collections?${qs}`);
      return { items: collectionSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; client: string; bankAccount?: string; reference?: string; remark?: string; items: { clientInvoiceId: string; amount: number }[] }) => {
      const parsed = createCollectionSchema.parse(input);
      return postJson<unknown>('/collections', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: colKeys.all }),
  });
}

export function usePostCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/collections/${id}/post`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: colKeys.all }),
  });
}