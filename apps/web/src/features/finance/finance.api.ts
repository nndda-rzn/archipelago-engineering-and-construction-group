import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chartOfAccountSchema, collectionSchema, createChartOfAccountSchema, createClientInvoiceSchema, createCollectionSchema, createJournalSchema, createPaymentSchema, createProgressClaimSchema, createVendorInvoiceSchema, clientInvoiceSchema, journalSchema, paymentSchema, progressClaimSchema, trialBalanceSchema, vendorInvoiceSchema, type ChartOfAccount, type ClientInvoice, type Collection, type CreateChartOfAccount, type CreateClientInvoice, type CreateCollection, type CreateJournal, type CreatePayment, type CreateProgressClaim, type CreateVendorInvoice, type Journal, type Payment, type ProgressClaim, type TrialBalance, type VendorInvoice } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const invKeys = { all: ['vendor-invoices'] as const, list: (params: object) => [...invKeys.all, 'list', params] as const };
export const payKeys = { all: ['payments'] as const, list: (params: object) => [...payKeys.all, 'list', params] as const };
export const coaKeys = { all: ['chart-of-accounts'] as const, list: (params: object) => [...coaKeys.all, 'list', params] as const };
export const jrnKeys = { all: ['journals'] as const, list: (params: object) => [...jrnKeys.all, 'list', params] as const };
export const tbKeys = { all: ['trial-balance'] as const, get: (params: object) => [...tbKeys.all, 'get', params] as const };
export const claimKeys = { all: ['progress-claims'] as const, list: (params: object) => [...claimKeys.all, 'list', params] as const };
export const cinvKeys = { all: ['client-invoices'] as const, list: (params: object) => [...cinvKeys.all, 'list', params] as const };
export const colKeys = { all: ['collections'] as const, list: (params: object) => [...colKeys.all, 'list', params] as const };

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

export function useTrialBalance(params: { legalEntityId?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: tbKeys.get(params),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.legalEntityId) qs.set('legalEntityId', params.legalEntityId);
      if (params.from) qs.set('from', params.from);
      if (params.to) qs.set('to', params.to);
      const data = await getJson<unknown>(`/gl/trial-balance?${qs}`);
      return trialBalanceSchema.parse(data);
    },
    enabled: !!params.legalEntityId,
  });
}

export function useProgressClaims(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: claimKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/progress-claims?${qs}`);
      return { items: progressClaimSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateProgressClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProgressClaim) => {
      const parsed = createProgressClaimSchema.parse(input);
      return postJson<unknown>('/progress-claims', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: claimKeys.all }),
  });
}

export function useCertifyClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, certifiedAmount, remark }: { id: string; certifiedAmount: number; remark?: string }) =>
      postJson<unknown>(`/progress-claims/${id}/certify`, { certifiedAmount, remark }),
    onSuccess: () => qc.invalidateQueries({ queryKey: claimKeys.all }),
  });
}

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
    mutationFn: (input: CreateClientInvoice) => {
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

export function useCollections(params: { page: number; pageSize: number }) {
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
    mutationFn: (input: CreateCollection) => {
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

export type { ChartOfAccount, ClientInvoice, Collection, CreateChartOfAccount, CreateClientInvoice, CreateCollection, CreateJournal, CreatePayment, CreateProgressClaim, Journal, Payment, ProgressClaim, TrialBalance, VendorInvoice };
