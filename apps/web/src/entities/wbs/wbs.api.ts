import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  wbsItemSchema,
  createWbsItemSchema,
  updateWbsItemSchema,
  moveWbsItemSchema,
  type CreateWbsItem,
  type UpdateWbsItem,
  type MoveWbsItem,
} from '@aec/api-contracts';
import { deleteJson, getJson, patchJson, postJson } from '@/shared/lib/http';

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

export function useUpdateWbsItem(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...wbsKeys.all(projectId), 'update'],
    mutationFn: async ({ itemId, input }: { itemId: string; input: UpdateWbsItem }) => {
      const parsed = updateWbsItemSchema.parse(input);
      return patchJson<unknown>(`/projects/${projectId}/wbs/${itemId}`, parsed);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wbsKeys.all(projectId) }),
  });
}

export function useDeleteWbsItem(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...wbsKeys.all(projectId), 'delete'],
    mutationFn: (itemId: string) => deleteJson<unknown>(`/projects/${projectId}/wbs/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wbsKeys.all(projectId) }),
  });
}

export function useMoveWbsItem(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...wbsKeys.all(projectId), 'move'],
    mutationFn: async ({ itemId, ...input }: { itemId: string } & MoveWbsItem) => {
      const parsed = moveWbsItemSchema.parse(input);
      return postJson<unknown>(`/projects/${projectId}/wbs/${itemId}/move`, parsed);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wbsKeys.all(projectId) }),
  });
}
