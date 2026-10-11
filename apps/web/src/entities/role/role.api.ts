import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRoleSchema, updateRoleSchema, roleWithPermissionsSchema, roleStatsSchema,
  roleDetailSchema, permissionCatalogSchema,
  type CreateRole, type UpdateRole,
} from '@aec/api-contracts';
import { getJson, postJson, patchJson, putJson, deleteJson } from '@/shared/lib/http';

export const roleKeys = {
  all: ['roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
  stats: () => [...roleKeys.all, 'stats'] as const,
  detail: (id: string) => [...roleKeys.all, 'detail', id] as const,
  catalog: () => [...roleKeys.all, 'catalog'] as const,
};

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.list(),
    queryFn: async () => roleWithPermissionsSchema.array().parse(await getJson<unknown>('/roles')),
  });
}

export function useRoleStats() {
  return useQuery({
    queryKey: roleKeys.stats(),
    queryFn: async () => roleStatsSchema.parse(await getJson<unknown>('/roles/stats')),
  });
}

export function useRoleDetail(id: string) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: async () => roleDetailSchema.parse(await getJson<unknown>(`/roles/${id}`)),
    enabled: !!id,
  });
}

/** Katalog seluruh izin — sumber untuk matriks izin. */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: roleKeys.catalog(),
    queryFn: async () => permissionCatalogSchema.array().parse(await getJson<unknown>('/roles/permissions/catalog')),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...roleKeys.all, 'create'],
    mutationFn: async (input: CreateRole) => postJson<unknown>('/roles', createRoleSchema.parse(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

export function useUpdateRole(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateRole) => patchJson<unknown>(`/roles/${id}`, updateRoleSchema.parse(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

export function useSetRoleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => postJson<unknown>(`/roles/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJson<unknown>(`/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

/** Ganti izin role (diff). Mengembalikan `{ added, removed, permissionCount }`. */
export function useAssignPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissionCodes }: { id: string; permissionCodes: string[] }) =>
      putJson<{ added: string[]; removed: string[]; permissionCount: number }>(`/roles/${id}/permissions`, { permissionCodes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

export function useAddRoleMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId, reason }: { id: string; userId: string; reason?: string }) =>
      postJson<unknown>(`/roles/${id}/members`, { userId, reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
}

export function useRemoveRoleMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => deleteJson<unknown>(`/roles/${id}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.all }),
  });
}
