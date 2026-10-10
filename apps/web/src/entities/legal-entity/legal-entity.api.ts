import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLegalEntitySchema,
  legalEntitySchema,
  legalEntityUsageSchema,
  legalEntityListResponseSchema,
  updateLegalEntitySchema,
  type CreateLegalEntity,
  type LegalEntityListParams,
  type UpdateLegalEntity,
} from '@aec/api-contracts';
import { getJson, patchJson, postJson } from '@/shared/lib/http';

export const legalEntityKeys = {
  all: ['legal-entities'] as const,
  list: (params: LegalEntityListParams) => [...legalEntityKeys.all, 'list', params] as const,
  detail: (id: string) => [...legalEntityKeys.all, 'detail', id] as const,
  usage: (id: string) => [...legalEntityKeys.all, 'usage', id] as const,
};

export function useLegalEntities(params: LegalEntityListParams) {
  return useQuery({
    queryKey: legalEntityKeys.list(params),
    queryFn: async () => {
      const search = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
      });
      if (params.sortBy) search.set('sortBy', params.sortBy);
      if (params.sortDir) search.set('sortDir', params.sortDir);
      if (params.search) search.set('search', params.search);
      if (params.status) search.set('status', params.status);

      const data = await getJson<unknown>(`/legal-entities?${search.toString()}`);
      return legalEntityListResponseSchema.parse(data);
    },
    placeholderData: (prev) => prev,
  });
}

export function useLegalEntity(id: string) {
  return useQuery({
    queryKey: legalEntityKeys.detail(id),
    queryFn: async () => legalEntitySchema.parse(await getJson<unknown>(`/legal-entities/${id}`)),
    enabled: !!id,
  });
}

export function useLegalEntityUsage(id: string) {
  return useQuery({
    queryKey: legalEntityKeys.usage(id),
    queryFn: async () => legalEntityUsageSchema.parse(await getJson<unknown>(`/legal-entities/${id}/usage`)),
    enabled: !!id,
  });
}

export function useCreateLegalEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...legalEntityKeys.all, 'create'],
    mutationFn: async (input: CreateLegalEntity) => {
      const parsed = createLegalEntitySchema.parse(input);
      const data = await postJson<unknown>('/legal-entities', parsed);
      return legalEntitySchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalEntityKeys.all });
    },
  });
}

export function useUpdateLegalEntity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...legalEntityKeys.all, 'update', id],
    mutationFn: async (input: UpdateLegalEntity) => {
      const parsed = updateLegalEntitySchema.parse(input);
      const data = await patchJson<unknown>(`/legal-entities/${id}`, parsed);
      return legalEntitySchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalEntityKeys.all });
    },
  });
}

export function useBlockLegalEntity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...legalEntityKeys.all, 'block', id],
    mutationFn: async () => legalEntitySchema.parse(await postJson<unknown>(`/legal-entities/${id}/block`, {})),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalEntityKeys.all });
    },
  });
}

export function useUnblockLegalEntity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...legalEntityKeys.all, 'unblock', id],
    mutationFn: async () => legalEntitySchema.parse(await postJson<unknown>(`/legal-entities/${id}/unblock`, {})),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalEntityKeys.all });
    },
  });
}
