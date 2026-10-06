import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addWorkflowStepSchema,
  createWorkflowDefinitionSchema,
  publishWorkflowSchema,
  updateWorkflowDefinitionSchema,
  updateWorkflowStepSchema,
  workflowDefinitionSchema,
  workflowInsightsSchema,
  workflowVersionDiffSchema,
  workflowVersionSummarySchema,
  type AddWorkflowStep,
  type CreateWorkflowDefinition,
  type PublishWorkflow,
  type ReorderWorkflowSteps,
  type UpdateWorkflowDefinition,
  type UpdateWorkflowStep,
  type WorkflowDefinition,
  type WorkflowInsights,
  type WorkflowVersionDiff,
  type WorkflowVersionSummary,
} from '@aec/api-contracts';
import { deleteJson, getJson, patchJson, postJson } from '@/shared/lib/http';

export const workflowKeys = {
  all: ['approvals'] as const,
  workflows: () => [...workflowKeys.all, 'workflows'] as const,
  versions: (code: string) => [...workflowKeys.all, 'versions', code] as const,
  diff: (code: string, from: number, to: number) => [...workflowKeys.all, 'diff', code, from, to] as const,
  insights: (id: string) => [...workflowKeys.all, 'insights', id] as const,
};

export function useWorkflowDefinitions() {
  return useQuery({
    queryKey: workflowKeys.workflows(),
    queryFn: async (): Promise<WorkflowDefinition[]> => {
      const data = await getJson<unknown[]>('/approvals/workflows');
      return workflowDefinitionSchema.array().parse(data);
    },
  });
}

export function useWorkflowVersions(code: string | null) {
  return useQuery({
    queryKey: workflowKeys.versions(code ?? ''),
    enabled: Boolean(code),
    queryFn: async (): Promise<WorkflowVersionSummary[]> => {
      const data = await getJson<unknown[]>(`/approvals/workflows/${code}/versions`);
      return workflowVersionSummarySchema.array().parse(data);
    },
  });
}

export function useWorkflowVersionDiff(code: string | null, from: number | null, to: number | null) {
  return useQuery({
    queryKey: workflowKeys.diff(code ?? '', from ?? 0, to ?? 0),
    enabled: Boolean(code) && from != null && to != null,
    queryFn: async (): Promise<WorkflowVersionDiff> => {
      const data = await getJson<unknown>(`/approvals/workflows/${code}/versions/diff?from=${from}&to=${to}`);
      return workflowVersionDiffSchema.parse(data);
    },
  });
}

export function useWorkflowInsights(id: string | null) {
  return useQuery({
    queryKey: workflowKeys.insights(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<WorkflowInsights> => {
      const data = await getJson<unknown>(`/approvals/workflows/${id}/insights`);
      return workflowInsightsSchema.parse(data);
    },
  });
}

export function useCreateWorkflowDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkflowDefinition) => {
      const parsed = createWorkflowDefinitionSchema.parse(input);
      return postJson<unknown>('/approvals/workflows', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useUpdateWorkflowDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWorkflowDefinition }) => {
      const parsed = updateWorkflowDefinitionSchema.parse(input);
      return patchJson<unknown>(`/approvals/workflows/${id}`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useAddWorkflowStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddWorkflowStep }) => {
      const parsed = addWorkflowStepSchema.parse(input);
      return postJson<unknown>(`/approvals/workflows/${id}/steps`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useUpdateWorkflowStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stepId, input }: { id: string; stepId: string; input: UpdateWorkflowStep }) => {
      const parsed = updateWorkflowStepSchema.parse(input);
      return patchJson<unknown>(`/approvals/workflows/${id}/steps/${stepId}`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useRemoveWorkflowStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stepId }: { id: string; stepId: string }) =>
      deleteJson<unknown>(`/approvals/workflows/${id}/steps/${stepId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useReorderWorkflowSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReorderWorkflowSteps }) =>
      postJson<unknown>(`/approvals/workflows/${id}/steps/reorder`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function usePublishWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PublishWorkflow }) => {
      const parsed = publishWorkflowSchema.parse(input);
      return postJson<unknown>(`/approvals/workflows/${id}/publish`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useArchiveWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/approvals/workflows/${id}/archive`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJson<unknown>(`/approvals/workflows/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useNewWorkflowVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => postJson<unknown>(`/approvals/workflows/${code}/version`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export type { WorkflowDefinition, WorkflowVersionSummary, WorkflowVersionDiff, WorkflowInsights };
