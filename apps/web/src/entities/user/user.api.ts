import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUserSchema, updateUserSchema, userListResponseSchema, userStatsSchema, userDetailSchema,
  userSessionSchema, userActivitySchema, userSettingsSchema,
  type CreateUser, type UpdateUser,
} from '@aec/api-contracts';
import { getJson, patchJson, postJson, deleteJson } from '@/shared/lib/http';

export interface UserListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  roleCode?: string;
  noRole?: boolean;
}

export const userKeys = {
  all: ['users'] as const,
  list: (params: UserListParams) => [...userKeys.all, 'list', params] as const,
  stats: () => [...userKeys.all, 'stats'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  sessions: (id: string) => [...userKeys.all, 'sessions', id] as const,
  activity: (id: string) => [...userKeys.all, 'activity', id] as const,
  settings: (id: string) => [...userKeys.all, 'settings', id] as const,
};

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async () => {
      const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.search) search.set('search', params.search);
      if (params.status) search.set('status', params.status);
      if (params.roleCode) search.set('roleCode', params.roleCode);
      if (params.noRole) search.set('noRole', 'true');
      const data = await getJson<unknown>(`/users?${search.toString()}`);
      return userListResponseSchema.parse(data);
    },
    placeholderData: (prev) => prev,
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: async () => userStatsSchema.parse(await getJson<unknown>('/users/stats')),
  });
}

export function useUserDetail(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => userDetailSchema.parse(await getJson<unknown>(`/users/${id}`)),
    enabled: !!id,
  });
}

export function useUserActivity(id: string) {
  return useQuery({
    queryKey: userKeys.activity(id),
    queryFn: async () => userActivitySchema.array().parse(await getJson<unknown>(`/users/${id}/activity`)),
    enabled: !!id,
  });
}

export function useUserSettings(id: string) {
  return useQuery({
    queryKey: userKeys.settings(id),
    queryFn: async () => userSettingsSchema.parse(await getJson<unknown>(`/users/${id}/settings`)),
    enabled: !!id,
  });
}

export function useUserSessions(id: string) {
  return useQuery({
    queryKey: userKeys.sessions(id),
    queryFn: async () => userSessionSchema.array().parse(await getJson<unknown>(`/users/${id}/sessions`)),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...userKeys.all, 'create'],
    mutationFn: async (input: CreateUser) => {
      const parsed = createUserSchema.parse(input);
      return postJson<unknown>('/users', parsed);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateUser) => {
      const parsed = updateUserSchema.parse(input);
      return patchJson<unknown>(`/users/${id}`, parsed);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useSetUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      postJson<unknown>(`/users/${id}/status`, { status, reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

/** Dipertahankan untuk kompatibilitas; kini lewat endpoint status. */
export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...userKeys.all, 'block'],
    mutationFn: (id: string) => postJson<unknown>(`/users/${id}/block`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/users/${id}/unblock`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleCode, reason }: { id: string; roleCode: string; reason?: string }) =>
      postJson<unknown>(`/users/${id}/roles`, { roleCode, reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useRevokeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleCode }: { id: string; roleCode: string }) => deleteJson<unknown>(`/users/${id}/roles/${roleCode}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password?: string }) =>
      postJson<{ temporaryPassword: string }>(`/users/${id}/reset-password`, password ? { password } : {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useForceLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/users/${id}/force-logout`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sessionId }: { id: string; sessionId: string }) => deleteJson<unknown>(`/users/${id}/sessions/${sessionId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}
