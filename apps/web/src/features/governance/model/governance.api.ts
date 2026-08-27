import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRiskSchema, riskSchema, createAuditSchema, auditEngagementSchema,
  createLegalCaseSchema, legalCaseSchema, createAccessReviewSchema, accessReviewSchema,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const govKeys = {
  all: ['governance'] as const,
  risks: (params: object) => [...govKeys.all, 'risks', params] as const,
  audits: (params: object) => [...govKeys.all, 'audits', params] as const,
  legal: (params: object) => [...govKeys.all, 'legal', params] as const,
  reviews: (params: object) => [...govKeys.all, 'reviews', params] as const,
};

export function useRisks(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: govKeys.risks(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/governance/risks?${qs}`);
      return { items: riskSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; category?: string; likelihood: number; impact: number; owner: string; mitigation?: string }) => {
      const parsed = createRiskSchema.parse(input);
      return postJson<unknown>('/governance/risks', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: govKeys.all }),
  });
}

export function useMitigateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mitigation, residualLikelihood, residualImpact }: { id: string; mitigation?: string; residualLikelihood?: number; residualImpact?: number }) =>
      postJson<unknown>(`/governance/risks/${id}/mitigate`, { mitigation, residualLikelihood, residualImpact }),
    onSuccess: () => qc.invalidateQueries({ queryKey: govKeys.all }),
  });
}

export function useAudits(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: govKeys.audits(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/governance/audits?${qs}`);
      return { items: auditEngagementSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; scope?: string }) => {
      const parsed = createAuditSchema.parse(input);
      return postJson<unknown>('/governance/audits', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: govKeys.all }),
  });
}

export function useAdvanceAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status?: string }) => postJson<unknown>(`/governance/audits/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: govKeys.all }),
  });
}

export function useCreateFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ auditId, title, severity }: { auditId: string; title: string; severity?: string }) =>
      postJson<unknown>(`/governance/audits/${auditId}/findings`, { title, severity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: govKeys.all }),
  });
}

export function useRespondFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, response }: { id: string; status?: string; response?: string }) =>
      postJson<unknown>(`/governance/findings/${id}/respond`, { status, response }),
    onSuccess: () => qc.invalidateQueries({ queryKey: govKeys.all }),
  });
}

export function useLegalCases(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: govKeys.legal(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/governance/legal-cases?${qs}`);
      return { items: legalCaseSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateLegalCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; caseType?: string; counterpart?: string; description?: string }) => {
      const parsed = createLegalCaseSchema.parse(input);
      return postJson<unknown>('/governance/legal-cases', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: govKeys.all }),
  });
}

export function useUpdateLegalCaseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => postJson<unknown>(`/governance/legal-cases/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: govKeys.all }),
  });
}

export function useAccessReviews(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: govKeys.reviews(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/governance/access-reviews?${qs}`);
      return { items: accessReviewSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateAccessReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { period: string }) => {
      const parsed = createAccessReviewSchema.parse(input);
      return postJson<unknown>('/governance/access-reviews', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: govKeys.all }),
  });
}

export function useCompleteAccessReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => postJson<unknown>(`/governance/access-reviews/${id}/complete`, { notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: govKeys.all }),
  });
}
