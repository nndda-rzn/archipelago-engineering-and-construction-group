import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProgressClaimSchema, progressClaimSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const claimKeys = { all: ['progress-claims'] as const, list: (params: object) => [...claimKeys.all, 'list', params] as const };

export function useProgressClaims(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: claimKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/progress-claims?${qs}`);
      return { items: progressClaimSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateProgressClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      projectId: string;
      claimDate?: string;
      period?: string;
      description?: string;
      amount: number;
      workPackageId?: string;
      physicalProgressAtClaim?: number;
      billableProgress?: number;
    }) => {
      const parsed = createProgressClaimSchema.parse(input);
      return postJson<unknown>('/progress-claims', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: claimKeys.all }),
  });
}

export function useCertifyClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, certifiedAmount, retentionRate, remark }: { id: string; certifiedAmount: number; retentionRate?: number; remark?: string }) =>
      postJson<unknown>(`/progress-claims/${id}/certify`, { certifiedAmount, retentionRate, remark }),
    onSuccess: () => qc.invalidateQueries({ queryKey: claimKeys.all }),
  });
}