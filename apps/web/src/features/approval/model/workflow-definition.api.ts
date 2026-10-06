import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addWorkflowStepSchema,
  createWorkflowDefinitionSchema,
  duplicateWorkflowSchema,
  publishWorkflowSchema,
  updateWorkflowDefinitionSchema,
  updateWorkflowStepSchema,
  workflowDefinitionSchema,
  workflowInsightsSchema,
  workflowTemplateSchema,
  workflowVersionDiffSchema,
  workflowVersionSummarySchema,
  type AddWorkflowStep,
  type CreateWorkflowDefinition,
  type DuplicateWorkflow,
  type PublishWorkflow,
  type ReorderWorkflowSteps,
  type UpdateWorkflowDefinition,
  type UpdateWorkflowStep,
  type WorkflowDefinition,
  type WorkflowInsights,
  type WorkflowTemplate,
  type WorkflowVersionDiff,
  type WorkflowVersionSummary,
} from '@aec/api-contracts';
import { deleteJson, getJson, patchJson, postJson } from '@/shared/lib/http';

export const workflowKeys = {
  all: ['approvals'] as const,
  workflows: () => [...workflowKeys.all, 'workflows'] as const,
  templates: (transactionType?: string) => [...workflowKeys.all, 'templates', transactionType ?? 'all'] as const,
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

export function useWorkflowInsights(id: string | null, scope: 'version' | 'type' = 'type') {
  return useQuery({
    queryKey: [...workflowKeys.insights(id ?? ''), scope],
    enabled: Boolean(id),
    queryFn: async (): Promise<WorkflowInsights> => {
      const data = await getJson<unknown>(`/approvals/workflows/${id}/insights?scope=${scope}`);
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

/** Template rantai siap pakai, opsional disaring per jenis transaksi. */
export function useWorkflowTemplates(transactionType?: string) {
  return useQuery({
    queryKey: workflowKeys.templates(transactionType),
    queryFn: async (): Promise<WorkflowTemplate[]> => {
      const qs = transactionType ? `?transactionType=${encodeURIComponent(transactionType)}` : '';
      const data = await getJson<unknown[]>(`/approvals/workflows/templates${qs}`);
      return workflowTemplateSchema.array().parse(data);
    },
  });
}

/** Duplikasi definisi menjadi definisi baru (kode baru, DRAFT, versi 1). */
export function useDuplicateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DuplicateWorkflow }) => {
      const parsed = duplicateWorkflowSchema.parse(input);
      return postJson<unknown>(`/approvals/workflows/${id}/duplicate`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

/** Buat definisi + langkah-langkah template sekaligus (kode baru, DRAFT). */
export function useCreateWorkflowFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ template, code, name }: { template: WorkflowTemplate; code: string; name: string }) => {
      const input: CreateWorkflowDefinition = {
        code,
        name,
        transactionType: template.transactionType as CreateWorkflowDefinition['transactionType'],
      };
      const created = await postJson<{ id: string }>('/approvals/workflows', createWorkflowDefinitionSchema.parse(input));
      // Langkah ditambahkan berurutan: stepOrder unik per definisi, jadi tidak bisa
      // dikirim sekaligus lewat endpoint create.
      for (const [index, step] of template.steps.entries()) {
        await postJson(`/approvals/workflows/${created.id}/steps`, {
          stepOrder: index + 1,
          name: step.name,
          approverRoleCode: step.approverRoleCode,
          ...(step.conditionField ? {
            conditionField: step.conditionField,
            conditionOp: step.conditionOp,
            conditionValue: step.conditionValue,
          } : {}),
        });
      }
      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export type { WorkflowDefinition, WorkflowVersionSummary, WorkflowVersionDiff, WorkflowInsights, WorkflowTemplate };
