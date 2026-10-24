import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClientSchema, clientSchema, createOpportunitySchema, opportunitySchema, createContractSchema, contractSchema, commercialSummarySchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const commercialKeys = {
  all: ['commercial'] as const,
  summary: ['commercial', 'summary'] as const,
  clients: (params: CommercialListParams) => ['commercial', 'clients', params] as const,
  opportunities: (params: CommercialListParams) => ['commercial', 'opportunities', params] as const,
  contracts: (params: CommercialListParams) => ['commercial', 'contracts', params] as const,
};

/** Params list dengan filter opsional yang didukung API (stage/status/clientId). */
export type CommercialListParams = PaginationParams & { stage?: string; status?: string; clientId?: string };

function filterQs(params: CommercialListParams): URLSearchParams {
  const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
  if (params.stage) qs.set('stage', params.stage);
  if (params.status) qs.set('status', params.status);
  if (params.clientId) qs.set('clientId', params.clientId);
  return qs;
}

/** Ringkasan komersial (pipeline, win rate, contract book, funnel) untuk Section 1. */
export function useCommercialSummary() {
  return useQuery({
    queryKey: commercialKeys.summary,
    queryFn: async () => commercialSummarySchema.parse(await getJson<unknown>('/commercial/summary')),
  });
}

export function useClients(params: CommercialListParams) {
  return useQuery({
    queryKey: commercialKeys.clients(params),
    queryFn: async () => {
      const data = await getJson<{ items: unknown; total: number }>(`/clients?${filterQs(params)}`);
      return { items: clientSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; industry?: string; contactPerson?: string; email?: string; phone?: string }) => {
      const parsed = createClientSchema.parse(input);
      return postJson<unknown>('/clients', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: commercialKeys.all }),
  });
}

export function useOpportunities(params: CommercialListParams) {
  return useQuery({
    queryKey: commercialKeys.opportunities(params),
    queryFn: async () => {
      const data = await getJson<{ items: unknown; total: number }>(`/opportunities?${filterQs(params)}`);
      return { items: opportunitySchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { clientId: string; title: string; expectedValue: number; owner: string; stage?: string; probability?: number; expectedDate?: string }) => {
      const parsed = createOpportunitySchema.parse(input);
      return postJson<unknown>('/opportunities', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: commercialKeys.all }),
  });
}

export function useUpdateOpportunityStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, probability }: { id: string; stage?: string; probability?: number }) =>
      postJson<unknown>(`/opportunities/${id}/stage`, { stage, probability }),
    onSuccess: () => qc.invalidateQueries({ queryKey: commercialKeys.all }),
  });
}

export function useContracts(params: CommercialListParams) {
  return useQuery({
    queryKey: commercialKeys.contracts(params),
    queryFn: async () => {
      const data = await getJson<{ items: unknown; total: number }>(`/contracts?${filterQs(params)}`);
      return { items: contractSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId?: string; clientId?: string; contractType?: string; title: string; value: number; advanceTerm?: number; retentionTerm?: number }) => {
      const parsed = createContractSchema.parse(input);
      return postJson<unknown>('/contracts', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: commercialKeys.all }),
  });
}

export function useExecuteContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => postJson<unknown>(`/contracts/${id}/execute`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: commercialKeys.all }),
  });
}
