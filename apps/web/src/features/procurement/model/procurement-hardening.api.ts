import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  budgetStatusSchema, commercialEvaluationSchema, createPoChangeSchema, createVendorRatingSchema,
  poChangeSchema, vendorPerformanceSchema, vendorRatingSchema,
  type BudgetStatus, type CommercialEvaluation, type PoChange, type VendorPerformance, type VendorRating,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const hardeningKeys = {
  all: ['procurement-hardening'] as const,
  budgetStatus: (projectId: string) => [...hardeningKeys.all, 'budget', projectId] as const,
  commercialEval: (rfqId: string) => [...hardeningKeys.all, 'commercial', rfqId] as const,
  poChanges: (poId: string) => [...hardeningKeys.all, 'po-changes', poId] as const,
  ratings: (params: PaginationParams) => [...hardeningKeys.all, 'ratings', params] as const,
  summary: () => [...hardeningKeys.all, 'summary'] as const,
};

export function useBudgetStatus(projectId: string) {
  return useQuery({
    queryKey: hardeningKeys.budgetStatus(projectId),
    queryFn: async () => {
      const data = await getJson<unknown>(`/projects/${projectId}/budget-status`);
      return budgetStatusSchema.parse(data);
    },
    enabled: !!projectId,
  });
}

export function useCommercialEvaluation(rfqId: string) {
  return useQuery({
    queryKey: hardeningKeys.commercialEval(rfqId),
    queryFn: async () => {
      const data = await getJson<unknown>(`/rfqs/${rfqId}/commercial-evaluation`);
      return commercialEvaluationSchema.parse(data);
    },
    enabled: !!rfqId,
  });
}

export function usePoChanges(poId: string) {
  return useQuery({
    queryKey: hardeningKeys.poChanges(poId),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>(`/purchase-orders/${poId}/po-changes`);
      return { items: poChangeSchema.array().parse(data.items) };
    },
    enabled: !!poId,
  });
}

export function useCreatePoChange(poId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { newTotal: number; reason: string }) => {
      const parsed = createPoChangeSchema.parse(input);
      return postJson<unknown>(`/purchase-orders/${poId}/po-changes`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useApprovePoChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/po-changes/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useVendorRatings(params: PaginationParams) {
  return useQuery({
    queryKey: hardeningKeys.ratings(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/vendor-performance?${qs}`);
      return { items: vendorRatingSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateVendorRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { vendorId: string; projectId?: string; category: string; score: number; remark?: string }) => {
      const parsed = createVendorRatingSchema.parse(input);
      return postJson<unknown>('/vendor-performance', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hardeningKeys.all }),
  });
}

export function useVendorPerformanceSummary() {
  return useQuery({
    queryKey: hardeningKeys.summary(),
    queryFn: async () => {
      const data = await getJson<unknown>('/vendor-performance/summary');
      return vendorPerformanceSchema.parse(data);
    },
  });
}

export type { BudgetStatus, CommercialEvaluation, PoChange, VendorPerformance, VendorRating };
