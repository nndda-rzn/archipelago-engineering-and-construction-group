import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commissioningSystemSchema, createCommissioningSchema, createDailyReportSchema, createHandoverSchema, createWorkPackageSchema, dailyReportListResponseSchema, handoverListResponseSchema, workPackageListResponseSchema, type CommissioningSystem, type HandoverPackage, type WorkPackage } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const workPackageKeys = {
  all: (projectId: string) => ['projects', projectId, 'work-packages'] as const,
  list: (projectId: string, params: PaginationParams) => [...workPackageKeys.all(projectId), 'list', params] as const,
};

export function useWorkPackages(projectId: string, params: PaginationParams) {
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

export type { WorkPackage, CommissioningSystem, HandoverPackage };

export const commissioningKeys = {
  all: (projectId: string) => ['projects', projectId, 'commissioning'] as const,
};

export function useCommissioningTree(projectId: string) {
  return useQuery({
    queryKey: commissioningKeys.all(projectId),
    queryFn: async () => {
      const data = await getJson<unknown>(`/projects/${projectId}/commissioning`);
      return commissioningSystemSchema.array().parse(data);
    },
    enabled: !!projectId,
  });
}

export function useCreateCommissioning(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { parentId?: string; code: string; name: string; level: 'PLANT' | 'SYSTEM' | 'SUBSYSTEM' | 'EQUIPMENT'; remark?: string }) => {
      const parsed = createCommissioningSchema.parse({ projectId, ...input });
      return postJson<unknown>(`/projects/${projectId}/commissioning`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: commissioningKeys.all(projectId) }),
  });
}

export function useUpdateCommissioningStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' }) =>
      postJson<unknown>(`/projects/${projectId}/commissioning/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: commissioningKeys.all(projectId) }),
  });
}

export const handoverKeys = {
  all: (projectId: string) => ['projects', projectId, 'handovers'] as const,
  list: (projectId: string, params: PaginationParams) => [...handoverKeys.all(projectId), 'list', params] as const,
};

export function useHandovers(projectId: string, params: PaginationParams) {
  return useQuery({
    queryKey: handoverKeys.list(projectId, params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<unknown>(`/projects/${projectId}/handovers?${qs}`);
      return handoverListResponseSchema.parse(data);
    },
    enabled: !!projectId,
  });
}

export function useCreateHandover(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; handoverDate?: string; checklist?: string; note?: string; items?: { documentName: string; isMandatory?: boolean }[] }) => {
      const parsed = createHandoverSchema.parse({ projectId, ...input });
      return postJson<unknown>(`/projects/${projectId}/handovers`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: handoverKeys.all(projectId) }),
  });
}

export function useSubmitHandover(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/projects/${projectId}/handovers/${id}/submit`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: handoverKeys.all(projectId) }),
  });
}

export function useVerifyHandoverItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
      postJson<unknown>(`/projects/${projectId}/handovers/${id}/items/${itemId}/verify`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: handoverKeys.all(projectId) }),
  });
}

export function useApproveHandover(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/projects/${projectId}/handovers/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: handoverKeys.all(projectId) }),
  });
}

export const dailyReportKeys = {
  all: (projectId: string) => ['projects', projectId, 'daily-reports'] as const,
  list: (projectId: string, params: PaginationParams) => [...dailyReportKeys.all(projectId), 'list', params] as const,
};

export function useDailyReports(projectId: string, params: PaginationParams) {
  return useQuery({
    queryKey: dailyReportKeys.list(projectId, params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/projects/${projectId}/daily-reports?${qs}`);
      const parsed = dailyReportListResponseSchema.parse(data);
      return { items: parsed.items, total: parsed.total };
    },
    enabled: !!projectId,
  });
}

export function useCreateDailyReport(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...dailyReportKeys.all(projectId), 'create'],
    mutationFn: (input: {
      reportDate?: string;
      weather?: string;
      temperatureC?: number;
      summary: string;
      issues?: string;
      hseNote?: string;
      qualityNote?: string;
      equipmentList?: string;
      materialList?: string;
      manpowerLines?: { trade: string; manpowerCount: number; hoursWorked: number; note?: string }[];
    }) => {
      const parsed = createDailyReportSchema.parse({ projectId, ...input });
      return postJson<unknown>(`/projects/${projectId}/daily-reports`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dailyReportKeys.all(projectId) }),
  });
}
