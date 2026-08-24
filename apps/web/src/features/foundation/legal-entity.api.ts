import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLegalEntitySchema,
  legalEntitySchema,
  type CreateLegalEntity,
  type LegalEntity,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const legalEntityKeys = {
  all: ['legal-entities'] as const,
  list: () => [...legalEntityKeys.all, 'list'] as const,
};

export function useLegalEntities() {
  return useQuery({
    queryKey: legalEntityKeys.list(),
    queryFn: async () => {
      const data = await getJson<unknown>('/legal-entities');
      return zArrayLegalEntity.parse(data);
    },
  });
}

const zArrayLegalEntity = legalEntitySchema.array();

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
      queryClient.invalidateQueries({ queryKey: legalEntityKeys.list() });
    },
  });
}
