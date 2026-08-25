import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createWorkPackageSchema, workPackageListResponseSchema, type WorkPackage } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const workPackageKeys = {
  all: (projectId: string) => ['projects', projectId, 'work-packages'] as const,
  list: (projectId: string, params: object) => [...workPackageKeys.all(projectId), 'list', params] as const,
};

export function useWorkPackages(projectId: string, params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: workPackageKeys.list(projectId, params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<unknown>(`/projects/${projectId}/work-packages?${qs}`);
      return workPackageListResponseSchema.parse(data);
    },
    enabled: !!projectId,
  });
}

export function useCreateWorkPackage(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...workPackageKeys.all(projectId), 'create'],
    mutationFn: (input: {
      wbsItemId: string;
      title: string;
      description?: string;
      scope?: string;
      plannedQty: number;
      unit?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const parsed = createWorkPackageSchema.parse({ projectId, ...input });
      return postJson<unknown>(`/projects/${projectId}/work-packages`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: workPackageKeys.all(projectId) }),
  });
}

export function useStartWorkPackage(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/projects/${projectId}/work-packages/${id}/start`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: workPackageKeys.all(projectId) }),
  });
}

export function useCompleteWorkPackage(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/projects/${projectId}/work-packages/${id}/complete`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: workPackageKeys.all(projectId) }),
  });
}

export function useAddProgress(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { physicalProgress: number; achievedQty: number; note?: string; measuredBy: string };
    }) => postJson<unknown>(`/projects/${projectId}/work-packages/${id}/progress`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: workPackageKeys.all(projectId) }),
  });
}

export type { WorkPackage };
