import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addWorkflowStepSchema, createWorkflowDefinitionSchema, publishWorkflowSchema, workflowDefinitionSchema, type AddWorkflowStep, type CreateWorkflowDefinition, type PublishWorkflow, type WorkflowDefinition } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const workflowKeys = {
  all: ['approvals'] as const,
  workflows: () => [...workflowKeys.all, 'workflows'] as const,
};

export function useWorkflowDefinitions() {
  return useQuery({
    queryKey: workflowKeys.workflows(),
    queryFn: async () => {
      const data = await getJson<unknown[]>('/approvals/workflows');
      return workflowDefinitionSchema.array().parse(data);
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

export function useNewWorkflowVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => postJson<unknown>(`/approvals/workflows/${code}/version`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export type { WorkflowDefinition };
