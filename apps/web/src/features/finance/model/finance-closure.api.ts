import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  balanceSheetSchema, consolidationSchema, createIntercompanySchema, createPeriodCloseSchema,
  incomeStatementSchema, intercompanyReconciliationSchema, intercompanySchema, periodCloseSchema,
  type BalanceSheet, type Consolidation, type IncomeStatement, type Intercompany, type PeriodClose,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const financeClosureKeys = {
  all: ['finance-closure'] as const,
  intercompany: (params: PaginationParams) => [...financeClosureKeys.all, 'intercompany', params] as const,
  reconciliation: () => [...financeClosureKeys.all, 'reconciliation'] as const,
  periodCloses: () => [...financeClosureKeys.all, 'period-closes'] as const,
  incomeStatement: (params: { legalEntityId: string; from?: string; to?: string }) => [...financeClosureKeys.all, 'income-statement', params] as const,
  balanceSheet: (params: { legalEntityId: string; from?: string; to?: string }) => [...financeClosureKeys.all, 'balance-sheet', params] as const,
  consolidation: () => [...financeClosureKeys.all, 'consolidation'] as const,
};

export function useIntercompany(params: PaginationParams) {
  return useQuery({
    queryKey: financeClosureKeys.intercompany(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/intercompany?${qs}`);
      return { items: intercompanySchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateIntercompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { fromEntityId: string; toEntityId: string; amount: number; currency?: string; description?: string }) => {
      const parsed = createIntercompanySchema.parse(input);
      return postJson<unknown>('/intercompany', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: financeClosureKeys.all }),
  });
}

export function usePostIntercompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/intercompany/${id}/post`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: financeClosureKeys.all }),
  });
}

export function useIntercompanyReconciliation() {
  return useQuery({
    queryKey: financeClosureKeys.reconciliation(),
    queryFn: async () => {
      const data = await getJson<unknown>('/intercompany/reconciliation');
      return intercompanyReconciliationSchema.parse(data);
    },
  });
}

export function usePeriodCloses() {
  return useQuery({
    queryKey: financeClosureKeys.periodCloses(),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>('/period-closes');
      return { items: periodCloseSchema.array().parse(data.items) };
    },
  });
}

export function useStartPeriodClose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { legalEntityId: string; period: string }) => {
      const parsed = createPeriodCloseSchema.parse(input);
      return postJson<unknown>('/period-closes', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: financeClosureKeys.all }),
  });
}

function usePeriodAction(action: 'step' | 'close' | 'lock') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; step?: string }) => {
      const body = action === 'step' ? { step: payload.step } : {};
      return postJson<unknown>(`/period-closes/${payload.id}/${action === 'step' ? 'step' : action}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: financeClosureKeys.all }),
  });
}

export const useCompleteStep = () => usePeriodAction('step');
export const useClosePeriod = () => usePeriodAction('close');
export const useLockPeriod = () => usePeriodAction('lock');

export function useIncomeStatement(params: { legalEntityId: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: financeClosureKeys.incomeStatement(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ legalEntityId: params.legalEntityId });
      if (params.from) qs.set('from', params.from);
      if (params.to) qs.set('to', params.to);
      const data = await getJson<unknown>(`/gl/income-statement?${qs}`);
      return incomeStatementSchema.parse(data);
    },
    enabled: !!params.legalEntityId,
  });
}

export function useBalanceSheet(params: { legalEntityId: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: financeClosureKeys.balanceSheet(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ legalEntityId: params.legalEntityId });
      if (params.from) qs.set('from', params.from);
      if (params.to) qs.set('to', params.to);
      const data = await getJson<unknown>(`/gl/balance-sheet?${qs}`);
      return balanceSheetSchema.parse(data);
    },
    enabled: !!params.legalEntityId,
  });
}

export function useConsolidation() {
  return useQuery({
    queryKey: financeClosureKeys.consolidation(),
    queryFn: async () => {
      const data = await getJson<unknown>('/gl/consolidation');
      return consolidationSchema.parse(data);
    },
  });
}

export type { BalanceSheet, Consolidation, IncomeStatement, Intercompany, PeriodClose };
