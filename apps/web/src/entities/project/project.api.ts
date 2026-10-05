import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProjectSchema, projectListResponseSchema, projectRegisterSchema, projectSchema, type CreateProject, type Project } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const projectKeys = {
  all: ['projects'] as const,
  list: (params: { page: number; pageSize: number; search?: string }) => [...projectKeys.all, 'list', params] as const,
  register: (params: { sort?: string; order?: string }) => [...projectKeys.all, 'register', params] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};

/**
 * Register proyek — satu payload (metadata + budget/actual/health) untuk
 * daftar/kartu/timeline. Terpisah dari `useProjects` agar 25 pemakai lama
 * tidak terpengaruh.
 */
export function useProjectRegister(params: { sort?: string; order?: string } = {}) {
  return useQuery({
    queryKey: projectKeys.register(params),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.sort) qs.set('sort', params.sort);
      if (params.order) qs.set('order', params.order);
      const suffix = qs.toString();
      const data = await getJson<unknown>(`/projects/register${suffix ? `?${suffix}` : ''}`);
      return projectRegisterSchema.parse(data);
    },
    placeholderData: (prev) => prev,
  });
}

/** Detail satu proyek (metadata + legal entity). */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const data = await getJson<unknown>(`/projects/${id}`);
      return projectSchema.extend({ legalEntity: projectSchema.partial().optional() }).parse(data) as Project;
    },
    enabled: !!id,
  });
}

export function useProjects(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: async () => {
      const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.search) search.set('search', params.search);
      const data = await getJson<unknown>(`/projects?${search.toString()}`);
      return projectListResponseSchema.parse(data);
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...projectKeys.all, 'create'],
    mutationFn: async (input: CreateProject) => {
      const parsed = createProjectSchema.parse(input);
      return postJson<unknown>('/projects', parsed);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
