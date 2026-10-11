import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addProjectMemberSchema, createProjectSchema, projectActivitySchema, projectListResponseSchema,
  projectRegisterSchema, projectSchema, projectStatsSchema, projectTeamSchema, updateProjectMetaSchema,
  personRefSchema, updateProjectSchema, projectSummarySchema, projectScheduleSchema, projectCashFlowSchema,
  projectStakeholderSchema, createMilestoneSchema, advancePhaseSchema, projectDomainsSchema, projectGanttSchema,
  type AddProjectMember, type CreateProject, type UpdateProject, type UpdateProjectMeta, type CreateMilestone, type AdvancePhase,
} from '@aec/api-contracts';
import { getJson, patchJson, postJson, deleteJson } from '@/shared/lib/http';

export const projectKeys = {
  all: ['projects'] as const,
  list: (params: { page: number; pageSize: number; search?: string }) => [...projectKeys.all, 'list', params] as const,
  register: (params: { sort?: string; order?: string }) => [...projectKeys.all, 'register', params] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  stats: () => [...projectKeys.all, 'stats'] as const,
  team: (id: string) => [...projectKeys.all, 'team', id] as const,
  activity: (id: string) => [...projectKeys.all, 'activity', id] as const,
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

/** Detail satu proyek (metadata + legal entity + manajer/direktur sebagai orang). */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const data = await getJson<unknown>(`/projects/${id}`);
      const schema = projectSchema.extend({
        legalEntity: projectSchema.partial().optional(),
        managerRef: personRefSchema.nullable().optional(),
        directorRef: personRefSchema.nullable().optional(),
      });
      return schema.parse(data);
    },
    enabled: !!id,
  });
}

/**
 * Ubah metadata proyek (PATCH). `code` & `legalEntityId` tidak dikirim —
 * keduanya bukan field yang dapat diubah.
 */
export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...projectKeys.all, 'update', id],
    mutationFn: async (input: UpdateProject) => {
      const parsed = updateProjectSchema.parse(input);
      return patchJson<unknown>(`/projects/${id}`, parsed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
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

/** KPI strip halaman Projects. */
export function useProjectStats() {
  return useQuery({
    queryKey: projectKeys.stats(),
    queryFn: async () => projectStatsSchema.parse(await getJson<unknown>('/projects/stats')),
  });
}

/** Tim proyek — siapa mengerjakan, sebagai apa, alokasi berapa %. */
export function useProjectTeam(id: string) {
  return useQuery({
    queryKey: projectKeys.team(id),
    queryFn: async () => projectTeamSchema.parse(await getJson<unknown>(`/projects/${id}/team`)),
    enabled: !!id,
  });
}

export function useProjectActivity(id: string) {
  return useQuery({
    queryKey: projectKeys.activity(id),
    queryFn: async () => projectActivitySchema.array().parse(await getJson<unknown>(`/projects/${id}/activity`)),
    enabled: !!id,
  });
}

export function useUpdateProjectMeta(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProjectMeta) => patchJson<unknown>(`/projects/${id}/meta`, updateProjectMetaSchema.parse(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useAddProjectMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddProjectMember) => postJson<unknown>(`/projects/${id}/team`, addProjectMemberSchema.parse(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useRemoveProjectMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => deleteJson<unknown>(`/projects/${id}/team/${assignmentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useProjectEmployees() {
  return useQuery({
    queryKey: [...projectKeys.all, 'employees'] as const,
    queryFn: async () => {
      const data = await getJson<{ items: Array<{ id: string; name: string; position: string; department: string | null; employeeNumber: string }> }>('/employees?pageSize=200');
      return data.items;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Command center (ringkasan, jadwal, aliran kas, fase, milestone) ─────────

export const commandCenterKeys = {
  summary: (id: string) => [...projectKeys.all, 'summary', id] as const,
  schedule: (id: string) => [...projectKeys.all, 'schedule', id] as const,
  cashFlow: (id: string) => [...projectKeys.all, 'cash-flow', id] as const,
  milestones: (id: string) => [...projectKeys.all, 'milestones', id] as const,
  stakeholders: (id: string) => [...projectKeys.all, 'stakeholders', id] as const,
};

export function useProjectSummary(id: string) {
  return useQuery({
    queryKey: commandCenterKeys.summary(id),
    queryFn: async () => projectSummarySchema.parse(await getJson<unknown>(`/projects/${id}/summary`)),
    enabled: !!id,
  });
}

export function useProjectSchedule(id: string) {
  return useQuery({
    queryKey: commandCenterKeys.schedule(id),
    queryFn: async () => projectScheduleSchema.parse(await getJson<unknown>(`/projects/${id}/schedule`)),
    enabled: !!id,
  });
}

export function useProjectCashFlow(id: string) {
  return useQuery({
    queryKey: commandCenterKeys.cashFlow(id),
    queryFn: async () => projectCashFlowSchema.parse(await getJson<unknown>(`/projects/${id}/cash-flow`)),
    enabled: !!id,
  });
}

export function useProjectDomains(id: string) {
  return useQuery({
    queryKey: [...projectKeys.all, 'domains', id] as const,
    queryFn: async () => projectDomainsSchema.parse(await getJson<unknown>(`/projects/${id}/domains`)),
    enabled: !!id,
  });
}

export function useProjectGantt(id: string) {
  return useQuery({
    queryKey: [...projectKeys.all, 'gantt', id] as const,
    queryFn: async () => projectGanttSchema.parse(await getJson<unknown>(`/projects/${id}/gantt`)),
    enabled: !!id,
  });
}

export function useProjectStakeholders(id: string) {
  return useQuery({
    queryKey: commandCenterKeys.stakeholders(id),
    queryFn: async () => projectStakeholderSchema.array().parse(await getJson<unknown>(`/projects/${id}/stakeholders`)),
    enabled: !!id,
  });
}

export function useCreateMilestone(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMilestone) => postJson<unknown>(`/projects/${id}/milestones`, createMilestoneSchema.parse(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateMilestone(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ milestoneId, ...input }: { milestoneId: string } & Partial<CreateMilestone>) =>
      patchJson<unknown>(`/projects/${id}/milestones/${milestoneId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useDeleteMilestone(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => deleteJson<unknown>(`/projects/${id}/milestones/${milestoneId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useAdvancePhase(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdvancePhase) => postJson<unknown>(`/projects/${id}/phases/advance`, advancePhaseSchema.parse(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
