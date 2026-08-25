import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQuoteSchema, createRfqSchema, rfqSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const rfqKeys = { all: ['rfq'] as const, list: (params: object) => [...rfqKeys.all, 'list', params] as const };

export function useRfqs(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: rfqKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/rfqs?${qs}`);
      return { items: rfqSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; requisitionId?: string; title: string; description?: string; dueDate?: string; items: { description: string; quantity: number; unit?: string; wbsItemId?: string }[] }) => {
      const parsed = createRfqSchema.parse(input);
      return postJson<unknown>('/rfqs', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: rfqKeys.all }),
  });
}

export function useSendRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/rfqs/${id}/send`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: rfqKeys.all }),
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rfqId, input }: { rfqId: string; input: { vendor: string; leadTimeDays?: number; remark?: string; items: { rfqItemId: string; unitPrice: number }[] } }) => {
      const parsed = createQuoteSchema.parse(input);
      return postJson<unknown>(`/rfqs/${rfqId}/quotes`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: rfqKeys.all }),
  });
}

export function useEvaluateRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/rfqs/${id}/evaluate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: rfqKeys.all }),
  });
}