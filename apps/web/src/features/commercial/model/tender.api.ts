import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bidDecisionSchema, contractAmendmentSchema, contractDeviationSchema, createBidDecisionSchema,
  createContractAmendmentSchema, createContractDeviationSchema, createEstimateSchema,
  createPricingScenarioSchema, createTenderSubmissionSchema, estimateSchema, tenderSubmissionSchema,
  type BidDecision, type ContractAmendment, type ContractDeviation, type Estimate, type TenderSubmission,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const tenderKeys = {
  all: ['tender'] as const,
  bidDecisions: (params: object) => [...tenderKeys.all, 'bid-decisions', params] as const,
  estimates: (opportunityId: string) => [...tenderKeys.all, 'estimates', opportunityId] as const,
  deviations: (opportunityId: string) => [...tenderKeys.all, 'deviations', opportunityId] as const,
  submissions: (params: object) => [...tenderKeys.all, 'submissions', params] as const,
  amendments: (contractId: string) => [...tenderKeys.all, 'amendments', contractId] as const,
};

export function useBidDecisions(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: tenderKeys.bidDecisions(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/bid-decisions?${qs}`);
      return { items: bidDecisionSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateBidDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, rationale }: { id: string; decision: string; rationale?: string }) => {
      const parsed = createBidDecisionSchema.parse({ decision, rationale });
      return postJson<unknown>(`/opportunities/${id}/bid-decision`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: tenderKeys.all }),
  });
}

export function useEstimates(opportunityId: string) {
  return useQuery({
    queryKey: tenderKeys.estimates(opportunityId),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>(`/opportunities/${opportunityId}/estimates`);
      return { items: estimateSchema.array().parse(data.items) };
    },
    enabled: !!opportunityId,
  });
}

export function useCreateEstimate(opportunityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { description?: string; totalAmount: number }) => {
      const parsed = createEstimateSchema.parse(input);
      return postJson<unknown>(`/opportunities/${opportunityId}/estimates`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: tenderKeys.all }),
  });
}

export function useCreatePricingScenario(estimateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { scenarioType: string; amount: number; marginPct?: number }) => {
      const parsed = createPricingScenarioSchema.parse(input);
      return postJson<unknown>(`/estimates/${estimateId}/pricing-scenarios`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: tenderKeys.all }),
  });
}

export function useTransitionEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => postJson<unknown>(`/estimates/${id}/transition`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tenderKeys.all }),
  });
}

export function useDeviations(opportunityId: string) {
  return useQuery({
    queryKey: tenderKeys.deviations(opportunityId),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>(`/opportunities/${opportunityId}/deviations`);
      return { items: contractDeviationSchema.array().parse(data.items) };
    },
    enabled: !!opportunityId,
  });
}

export function useCreateDeviation(opportunityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { clause: string; clientRequirement: string; aecPosition: string; risk?: string; owner: string }) => {
      const parsed = createContractDeviationSchema.parse(input);
      return postJson<unknown>(`/opportunities/${opportunityId}/deviations`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: tenderKeys.all }),
  });
}

function deviationAction(action: 'approve' | 'reject') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/deviations/${id}/${action}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: tenderKeys.all }),
  });
}

export const useApproveDeviation = () => deviationAction('approve');
export const useRejectDeviation = () => deviationAction('reject');

export function useTenderSubmissions(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: tenderKeys.submissions(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/tender-submissions?${qs}`);
      return { items: tenderSubmissionSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateTenderSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { opportunityId: string; estimateId?: string; channel?: string; packageVersion?: string; fileHash?: string }) => {
      const parsed = createTenderSubmissionSchema.parse(input);
      return postJson<unknown>('/tender-submissions', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: tenderKeys.all }),
  });
}

export function useAmendments(contractId: string) {
  return useQuery({
    queryKey: tenderKeys.amendments(contractId),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>(`/contracts/${contractId}/amendments`);
      return { items: contractAmendmentSchema.array().parse(data.items) };
    },
    enabled: !!contractId,
  });
}

export function useCreateAmendment(contractId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; description?: string; amountChange: number }) => {
      const parsed = createContractAmendmentSchema.parse(input);
      return postJson<unknown>(`/contracts/${contractId}/amendments`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: tenderKeys.all }),
  });
}

export function useExecuteAmendment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/amendments/${id}/execute`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: tenderKeys.all }),
  });
}

export type { BidDecision, ContractAmendment, ContractDeviation, Estimate, TenderSubmission };
