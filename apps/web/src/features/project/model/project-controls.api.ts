import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  commitmentSchema, controlAccountSchema, costCodeSchema, createControlAccountSchema, createCostCodeSchema,
  createForecastSchema, evmSchema, forecastSchema,
  type Commitment, type ControlAccount, type CostCode, type Evm, type Forecast,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const projectControlsKeys = {
  all: (projectId: string) => ['projects', projectId, 'controls'] as const,
  costCodes: (projectId: string, params: object) => [...projectControlsKeys.all(projectId), 'cost-codes', params] as const,
  controlAccounts: (projectId: string, params: object) => [...projectControlsKeys.all(projectId), 'control-accounts', params] as const,
  commitment: (projectId: string) => [...projectControlsKeys.all(projectId), 'commitment'] as const,
  forecasts: (projectId: string) => [...projectControlsKeys.all(projectId), 'forecasts'] as const,
  evm: (projectId: string) => [...projectControlsKeys.all(projectId), 'evm'] as const,
};

export function useCostCodes(projectId: string, params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: projectControlsKeys.costCodes(projectId, params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/projects/${projectId}/cost-codes?${qs}`);
      return { items: costCodeSchema.array().parse(data.items), total: data.total };
    },
    enabled: !!projectId,
  });
}

export function useCreateCostCode(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { code: string; name: string; wbsItemId?: string; costType?: string }) => {
      const parsed = createCostCodeSchema.parse(input);
      return postJson<unknown>(`/projects/${projectId}/cost-codes`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: projectControlsKeys.all(projectId) }),
  });
}

export function useControlAccounts(projectId: string, params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: projectControlsKeys.controlAccounts(projectId, params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/projects/${projectId}/control-accounts?${qs}`);
      return { items: controlAccountSchema.array().parse(data.items), total: data.total };
    },
    enabled: !!projectId,
  });
}

export function useCreateControlAccount(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { code: string; name: string; wbsItemId: string; responsibleManager: string; budgetAmount?: number; plannedValue?: number }) => {
      const parsed = createControlAccountSchema.parse(input);
      return postJson<unknown>(`/projects/${projectId}/control-accounts`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: projectControlsKeys.all(projectId) }),
  });
}

export function useCommitment(projectId: string) {
  return useQuery({
    queryKey: projectControlsKeys.commitment(projectId),
    queryFn: async () => {
      const data = await getJson<unknown>(`/projects/${projectId}/commitment`);
      return commitmentSchema.parse(data);
    },
    enabled: !!projectId,
  });
}

export function useForecasts(projectId: string) {
  return useQuery({
    queryKey: projectControlsKeys.forecasts(projectId),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>(`/projects/${projectId}/forecasts`);
      return { items: forecastSchema.array().parse(data.items) };
    },
    enabled: !!projectId,
  });
}

export function useCreateForecast(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { period: string; estimateAtCompletion: number; estimateToComplete?: number; note?: string }) => {
      const parsed = createForecastSchema.parse(input);
      return postJson<unknown>(`/projects/${projectId}/forecasts`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: projectControlsKeys.all(projectId) }),
  });
}

export function useEvm(projectId: string) {
  return useQuery({
    queryKey: projectControlsKeys.evm(projectId),
    queryFn: async () => {
      const data = await getJson<unknown>(`/projects/${projectId}/evm`);
      return evmSchema.parse(data);
    },
    enabled: !!projectId,
  });
}

export type { Commitment, ControlAccount, CostCode, Evm, Forecast };
