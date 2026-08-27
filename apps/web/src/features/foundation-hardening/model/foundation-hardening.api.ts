import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCurrencySchema, createDoaRuleSchema, createExchangeRateSchema, createOrganizationSchema,
  currencySchema, doaRuleSchema, exchangeRateSchema, ifcListSchema, organizationSchema,
  readinessSchema, resolveDoaSchema,
  type Currency, type DoaRule, type ExchangeRate, type Organization, type ResolveDoa,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const hardeningKeys = {
  all: ['foundation-hardening'] as const,
  organizations: (entityId: string, asOf?: string) => [...hardeningKeys.all, 'org', entityId, asOf] as const,
  doaRules: () => [...hardeningKeys.all, 'doa-rules'] as const,
  currencies: () => [...hardeningKeys.all, 'currencies'] as const,
  rates: () => [...hardeningKeys.all, 'rates'] as const,
  ifc: (projectId: string) => [...hardeningKeys.all, 'ifc', projectId] as const,
};

export function useOrganizations(entityId: string, asOf?: string) {
  return useQuery({
    queryKey: hardeningKeys.organizations(entityId, asOf),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (asOf) qs.set('asOf', asOf);
      const data = await getJson<{ roots: unknown }>(`/legal-entities/${entityId}/organizations?${qs}`);
      return organizationSchema.array().parse((data as { roots: Organization[] }).roots);
    },
    enabled: !!entityId,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { legalEntityId: string; name: string; orgType: string; parentId?: string }) => {
      const parsed = createOrganizationSchema.parse(input);
      return postJson<unknown>('/organizations', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useDoaRules() {
  return useQuery({
    queryKey: hardeningKeys.doaRules(),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>('/doa-rules');
      return { items: doaRuleSchema.array().parse(data.items) };
    },
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

export function useResolveDoa() {
  return useMutation({
    mutationFn: (input: { transactionType: string; amount?: number; projectId?: string; riskLevel?: string }) => {
      const parsed = resolveDoaSchema.parse;
      void parsed;
      return postJson<unknown>('/doa/resolve', input);
    },
  });
}

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
    mutationFn: (input: { code: string; name: string; symbol?: string }) => {
      const parsed = createCurrencySchema.parse(input);
      return postJson<unknown>('/currencies', parsed);
    },
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
    mutationFn: (input: { fromCurrencyId: string; toCurrencyId: string; rateType: string; rate: number }) => {
      const parsed = createExchangeRateSchema.parse(input);
      return postJson<unknown>('/exchange-rates', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useIfc(projectId: string) {
  return useQuery({
    queryKey: hardeningKeys.ifc(projectId),
    queryFn: async () => {
      const data = await getJson<unknown>(`/engineering/drawings/ifc?projectId=${projectId}`);
      return ifcListSchema.parse(data);
    },
    enabled: !!projectId,
  });
}

export function useReadiness(projectId: string, wpId: string) {
  return useQuery({
    queryKey: [...hardeningKeys.all, 'readiness', wpId],
    queryFn: async () => {
      const data = await getJson<unknown>(`/projects/${projectId}/work-packages/${wpId}/readiness`);
      return readinessSchema.parse(data);
    },
    enabled: !!projectId && !!wpId,
  });
}

export type { Currency, DoaRule, ExchangeRate, Organization, ResolveDoa };
