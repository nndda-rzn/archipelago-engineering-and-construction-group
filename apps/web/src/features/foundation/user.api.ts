import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUserSchema, userListResponseSchema, type CreateUser } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const userKeys = {
  all: ['users'] as const,
  list: (params: { page: number; pageSize: number; search?: string }) => [...userKeys.all, 'list', params] as const,
};

export function useUsers(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async () => {
      const search = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
      });
      if (params.search) search.set('search', params.search);
      const data = await getJson<unknown>(`/users?${search.toString()}`);
      return userListResponseSchema.parse(data);
    },
    placeholderData: (prev) => prev,
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

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...userKeys.all, 'block'],
    mutationFn: (id: string) => postJson<unknown>(`/users/${id}/block`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}
