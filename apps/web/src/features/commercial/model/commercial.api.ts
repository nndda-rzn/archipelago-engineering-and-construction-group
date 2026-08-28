import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClientSchema, clientSchema, createOpportunitySchema, opportunitySchema, createContractSchema, contractSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const commercialKeys = {
  all: ['commercial'] as const,
  clients: (params: PaginationParams) => [...commercialKeys.all, 'clients', params] as const,
  opportunities: (params: PaginationParams) => [...commercialKeys.all, 'opportunities', params] as const,
  contracts: (params: PaginationParams) => [...commercialKeys.all, 'contracts', params] as const,
};

export function useClients(params: PaginationParams) {
  return useQuery({
    queryKey: commercialKeys.clients(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/clients?${qs}`);
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

export function useOpportunities(params: PaginationParams) {
  return useQuery({
    queryKey: commercialKeys.opportunities(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/opportunities?${qs}`);
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

export function useContracts(params: PaginationParams) {
  return useQuery({
    queryKey: commercialKeys.contracts(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/contracts?${qs}`);
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
