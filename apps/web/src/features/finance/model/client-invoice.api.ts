import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientInvoiceSchema, createClientInvoiceSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const cinvKeys = { all: ['client-invoices'] as const, list: (params: object) => [...cinvKeys.all, 'list', params] as const };

export function useClientInvoices(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: cinvKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/client-invoices?${qs}`);
      return { items: clientInvoiceSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateClientInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { claimId: string; invoiceDate?: string; taxAmount?: number; remark?: string }) => {
      const parsed = createClientInvoiceSchema.parse(input);
      return postJson<unknown>('/client-invoices', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cinvKeys.all }),
  });
}

export function usePostClientInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/client-invoices/${id}/post`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: cinvKeys.all }),
  });
}