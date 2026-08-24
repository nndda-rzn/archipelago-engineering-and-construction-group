import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProjectSchema, projectHealthSchema, projectListResponseSchema, type CreateProject, type ProjectHealth } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const projectKeys = {
  all: ['projects'] as const,
  list: (params: { page: number; pageSize: number; search?: string }) => [...projectKeys.all, 'list', params] as const,
  health: (projectId: string) => [...projectKeys.all, 'health', projectId] as const,
};

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

export function useProjectHealth(projectId: string) {
  return useQuery({
    queryKey: projectKeys.health(projectId),
    queryFn: async () => {
      const data = await getJson<unknown>(`/projects/${projectId}/health`);
      return projectHealthSchema.parse(data);
    },
    enabled: !!projectId,
  });
}
export type { ProjectHealth };
