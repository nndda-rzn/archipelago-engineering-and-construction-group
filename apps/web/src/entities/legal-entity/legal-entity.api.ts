import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLegalEntitySchema,
  legalEntitySchema,
  legalEntityListResponseSchema,
  type CreateLegalEntity,
  type LegalEntity,
  type LegalEntityListParams,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const legalEntityKeys = {
  all: ['legal-entities'] as const,
  list: (params: LegalEntityListParams) => [...legalEntityKeys.all, 'list', params] as const,
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

      const data = await getJson<unknown>(`/legal-entities?${search.toString()}`);
      return legalEntityListResponseSchema.parse(data);
    },
    placeholderData: (prev) => prev,
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
