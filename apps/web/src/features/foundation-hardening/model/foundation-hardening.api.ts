import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';import {
  createCurrencySchema, createDoaRuleSchema, createExchangeRateSchema, createOrganizationSchema,
  currencySchema, doaAnalysisSchema, doaRuleSchema, exchangeRateSchema, organizationNodeSchema,
  rateHistorySchema, resolveDoaInputSchema,
  type Currency, type DoaRule, type ExchangeRate, type Organization, type OrganizationNode, type ResolveDoaInput,
} from '@aec/api-contracts';
import { getJson, patchJson, postJson } from '@/shared/lib/http';

export const hardeningKeys = {
  all: ['foundation-hardening'] as const,
  organizations: (entityId: string, asOf?: string) => [...hardeningKeys.all, 'org', entityId, asOf] as const,
  doaRules: () => [...hardeningKeys.all, 'doa-rules'] as const,
  doaAnalysis: (transactionType: string) => [...hardeningKeys.all, 'doa-analysis', transactionType] as const,
  currencies: () => [...hardeningKeys.all, 'currencies'] as const,
  rates: () => [...hardeningKeys.all, 'rates'] as const,
  rateHistory: (fromId: string, toId: string, rateType: string) => [...hardeningKeys.all, 'rate-history', fromId, toId, rateType] as const,
};

/* ── Organization ─────────────────────────────────────────────────────────── */

/**
 * Struktur organisasi sebagai **tree** (`{ item, children }`) — bentuk yang
 * dikembalikan `buildTree` di BE. Sebelumnya diparse sebagai array datar,
 * sehingga Zod selalu gagal dan section tampil kosong tanpa error.
 */
export function useOrganizations(entityId: string, asOf?: string) {
  return useQuery({
    queryKey: hardeningKeys.organizations(entityId, asOf),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (asOf) qs.set('asOf', asOf);
      const data = await getJson<{ roots: unknown }>(`/legal-entities/${entityId}/organizations?${qs}`);
      return organizationNodeSchema.array().parse((data as { roots: OrganizationNode[] }).roots);
    },
    enabled: !!entityId,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { legalEntityId: string; name: string; orgType: string; parentId?: string; effectiveFrom?: string; effectiveTo?: string }) => {
      const parsed = createOrganizationSchema.parse(input);
      return postJson<unknown>('/organizations', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; orgType?: string; parentId?: string; effectiveFrom?: string; effectiveTo?: string }) =>
      patchJson<unknown>(`/organizations/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useSetOrganizationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      postJson<unknown>(`/organizations/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

/* ── Delegation of Authority ──────────────────────────────────────────────── */

export function useDoaRules() {
  return useQuery({
    queryKey: hardeningKeys.doaRules(),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>('/doa-rules');
      return { items: doaRuleSchema.array().parse(data.items) };
    },
  });
}

export function useDoaAnalysis(transactionType: string) {
  return useQuery({
    queryKey: hardeningKeys.doaAnalysis(transactionType),
    queryFn: async () =>
      doaAnalysisSchema.parse(await getJson<unknown>(`/doa-rules/analysis?transactionType=${encodeURIComponent(transactionType)}`)),
    enabled: !!transactionType,
  });
}

export function useCreateDoaRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { transactionType: string; approverLevel: string; amountFrom?: number; amountTo?: number; riskLevel?: string; approverRoleCode?: string }) => {
      const parsed = createDoaRuleSchema.parse(input);
      return postJson<unknown>('/doa-rules', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useUpdateDoaRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; transactionType?: string; approverLevel?: string; amountFrom?: number; amountTo?: number; riskLevel?: string; approverRoleCode?: string; priority?: number }) =>
      patchJson<unknown>(`/doa-rules/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useSetDoaRuleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      postJson<unknown>(`/doa-rules/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useResolveDoa() {
  return useMutation({
    mutationFn: (input: ResolveDoaInput) => {
      const parsed = resolveDoaInputSchema.parse(input);
      return postJson<unknown>('/doa/resolve', parsed);
    },
  });
}

/* ── Currency & Exchange Rate ─────────────────────────────────────────────── */

export function useCurrencies() {
  return useQuery({
    queryKey: hardeningKeys.currencies(),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>('/currencies');
      return { items: currencySchema.array().parse(data.items) };
    },
  });
}

export function useCreateCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { code: string; name: string; symbol?: string; decimals?: number }) => {
      const parsed = createCurrencySchema.parse(input);
      return postJson<unknown>('/currencies', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useSetCurrencyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      postJson<unknown>(`/currencies/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useExchangeRates() {
  return useQuery({
    queryKey: hardeningKeys.rates(),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>('/exchange-rates');
      return { items: exchangeRateSchema.array().parse(data.items) };
    },
  });
}

export function useCreateExchangeRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { fromCurrencyId: string; toCurrencyId: string; rateType: string; rate: number; effectiveDate?: string }) => {
      const parsed = createExchangeRateSchema.parse(input);
      return postJson<unknown>('/exchange-rates', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useRateHistory(fromCurrencyId: string, toCurrencyId: string, rateType = 'SPOT') {
  return useQuery({
    queryKey: hardeningKeys.rateHistory(fromCurrencyId, toCurrencyId, rateType),
    queryFn: async () =>
      rateHistorySchema.parse(
        await getJson<unknown>(`/exchange-rates/history?fromCurrencyId=${fromCurrencyId}&toCurrencyId=${toCurrencyId}&rateType=${rateType}`),
      ),
    enabled: !!fromCurrencyId && !!toCurrencyId,
  });
}

/** Konversi nominal pada tanggal tertentu (memakai kurs historis). */
export function useRevalue() {
  return useMutation({
    mutationFn: (input: { amount: number; fromCurrencyCode: string; toCurrencyCode: string; asOf?: string }) =>
      postJson<{ from: string; to: string; amount: number; rate: number | null; converted: number | null; note?: string; asOf: string }>(
        '/currencies/revalue',
        input,
      ),
  });
}

export type { Currency, DoaRule, ExchangeRate, Organization, OrganizationNode };
