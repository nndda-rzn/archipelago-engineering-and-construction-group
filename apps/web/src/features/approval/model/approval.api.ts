import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addWorkflowStepSchema, approvalTaskSchema, createWorkflowDefinitionSchema, publishWorkflowSchema, workflowDefinitionSchema, type AddWorkflowStep, type ApprovalTask, type ApproveTask, type CreateWorkflowDefinition, type PublishWorkflow, type SubmitForApproval, type WorkflowDefinition } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const approvalKeys = {
  all: ['approvals'] as const,
  tasks: () => [...approvalKeys.all, 'tasks'] as const,
  workflows: () => [...approvalKeys.all, 'workflows'] as const,
};

export function useApprovalTasks() {
  return useQuery({
    queryKey: approvalKeys.tasks(),
    queryFn: async () => {
      const data = await getJson<{ items: unknown; total: number }>('/approvals');
      return {
        items: approvalTaskSchema.array().parse(data.items),
        total: data.total,
      };
    },
    refetchInterval: 15000,
  });
}

export function useSubmitForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitForApproval) => postJson<unknown>('/approvals/submit', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ApproveTask) => postJson<unknown>('/approvals/decide', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

export function useWorkflowDefinitions() {
  return useQuery({
    queryKey: approvalKeys.workflows(),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

export function useAddWorkflowStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddWorkflowStep }) => {
      const parsed = addWorkflowStepSchema.parse(input);
      return postJson<unknown>(`/approvals/workflows/${id}/steps`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

export function usePublishWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PublishWorkflow }) => {
      const parsed = publishWorkflowSchema.parse(input);
      return postJson<unknown>(`/approvals/workflows/${id}/publish`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

export function useNewWorkflowVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => postJson<unknown>(`/approvals/workflows/${code}/version`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

export type { ApprovalTask, WorkflowDefinition };
