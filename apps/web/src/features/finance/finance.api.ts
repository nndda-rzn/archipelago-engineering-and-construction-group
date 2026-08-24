import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chartOfAccountSchema, createChartOfAccountSchema, createJournalSchema, createPaymentSchema, createVendorInvoiceSchema, journalSchema, paymentSchema, vendorInvoiceSchema, type ChartOfAccount, type CreateChartOfAccount, type CreateJournal, type CreatePayment, type CreateVendorInvoice, type Journal, type Payment, type VendorInvoice } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const invKeys = { all: ['vendor-invoices'] as const, list: (params: object) => [...invKeys.all, 'list', params] as const };
export const payKeys = { all: ['payments'] as const, list: (params: object) => [...payKeys.all, 'list', params] as const };
export const coaKeys = { all: ['chart-of-accounts'] as const, list: (params: object) => [...coaKeys.all, 'list', params] as const };
export const jrnKeys = { all: ['journals'] as const, list: (params: object) => [...jrnKeys.all, 'list', params] as const };

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

export function usePayments(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: payKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/payments?${qs}`);
      return { items: paymentSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePayment) => {
      const parsed = createPaymentSchema.parse(input);
      return postJson<unknown>('/payments', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: payKeys.all }),
  });
}

export function useApprovePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/payments/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: payKeys.all }),
  });
}

export function usePayPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/payments/${id}/pay`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: payKeys.all }),
  });
}

export function useChartOfAccounts(params: { legalEntityId?: string }) {
  return useQuery({
    queryKey: coaKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.legalEntityId) qs.set('legalEntityId', params.legalEntityId);
      const data = await getJson<unknown[]>(`/chart-of-accounts?${qs}`);
      return chartOfAccountSchema.array().parse(data);
    },
  });
}

export function useCreateChartOfAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChartOfAccount) => {
      const parsed = createChartOfAccountSchema.parse(input);
      return postJson<unknown>('/chart-of-accounts', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: coaKeys.all }),
  });
}

export function useJournals(params: { page: number; pageSize: number; source?: string; status?: string }) {
  return useQuery({
    queryKey: jrnKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.source) qs.set('source', params.source);
      if (params.status) qs.set('status', params.status);
      const data = await getJson<{ items: unknown; total: number }>(`/journals?${qs}`);
      return { items: journalSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJournal) => {
      const parsed = createJournalSchema.parse(input);
      return postJson<unknown>('/journals', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: jrnKeys.all }),
  });
}

export function usePostJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/journals/${id}/post`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: jrnKeys.all }),
  });
}

export type { ChartOfAccount, CreateChartOfAccount, CreateJournal, Journal, Payment, VendorInvoice };
