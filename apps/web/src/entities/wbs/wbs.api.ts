import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wbsItemSchema, createWbsItemSchema, type CreateWbsItem, type WbsItem } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const wbsKeys = {
  all: (projectId: string) => ['projects', projectId, 'wbs'] as const,
};

export function useWbsTree(projectId: string) {
  return useQuery({
    queryKey: wbsKeys.all(projectId),
    queryFn: async () => {
      const data = await getJson<unknown>(`/projects/${projectId}/wbs`);
      return wbsItemSchema.array().parse(data);
    },
    enabled: !!projectId,
  });
}

export function useCreateWbsItem(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...wbsKeys.all(projectId), 'create'],
    mutationFn: async (input: CreateWbsItem) => {
      const parsed = createWbsItemSchema.parse(input);
      return postJson<unknown>(`/projects/${projectId}/wbs`, parsed);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wbsKeys.all(projectId) }),
  });
}
