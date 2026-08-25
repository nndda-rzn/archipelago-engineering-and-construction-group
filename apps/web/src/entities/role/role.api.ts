import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createRoleSchema, roleWithPermissionsSchema, type CreateRole } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const roleKeys = {
  all: ['roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
};

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.list(),
    queryFn: async () => {
      const data = await getJson<unknown>('/roles');
      return roleWithPermissionsSchema.array().parse(data);
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...roleKeys.all, 'create'],
    mutationFn: async (input: CreateRole) => {
      const parsed = createRoleSchema.parse(input);
      return postJson<unknown>('/roles', parsed);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
}
