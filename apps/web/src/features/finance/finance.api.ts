import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createVendorInvoiceSchema, vendorInvoiceSchema, type CreateVendorInvoice, type VendorInvoice } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const invKeys = { all: ['vendor-invoices'] as const, list: (params: object) => [...invKeys.all, 'list', params] as const };

export function useVendorInvoices(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: invKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/vendor-invoices?${qs}`);
      return { items: vendorInvoiceSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateVendorInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVendorInvoice) => {
      const parsed = createVendorInvoiceSchema.parse(input);
      return postJson<unknown>('/vendor-invoices', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.all }),
  });
}

export function usePostVendorInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/vendor-invoices/${id}/post`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: invKeys.all }),
  });
}

export type { VendorInvoice };
