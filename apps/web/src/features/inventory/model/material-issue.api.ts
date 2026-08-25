import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMaterialIssueSchema, materialIssueSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const miKeys = { all: ['material-issues'] as const, list: (params: object) => [...miKeys.all, 'list', params] as const };

export function useMaterialIssues(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: miKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/material-issues?${qs}`);
      return { items: materialIssueSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateMaterialIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; warehouseId: string; issuedTo: string; issueReason?: string; remark?: string; items: { description: string; quantity: number; unit?: string; wbsItemId?: string }[] }) => {
      const parsed = createMaterialIssueSchema.parse(input);
      return postJson<unknown>('/material-issues', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: miKeys.all }),
  });
}