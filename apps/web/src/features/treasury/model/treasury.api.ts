import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bankAccountSchema, bankGuaranteeSchema, cashForecastSchema, cashPositionSchema,
  createBankAccountSchema, createBankGuaranteeSchema, createCashForecastSchema, createFxExposureSchema,
  createPaymentProposalSchema, fxExposureSchema, paymentProposalSchema,
  type BankAccount, type BankGuarantee, type PaymentProposal,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export type { BankAccount, BankGuarantee, PaymentProposal };

export const treasuryKeys = {
  all: ['treasury'] as const,
  bankAccounts: (params: PaginationParams) => [...treasuryKeys.all, 'bank-accounts', params] as const,
  cashPosition: () => [...treasuryKeys.all, 'cash-position'] as const,
  proposals: (params: PaginationParams) => [...treasuryKeys.all, 'payment-proposals', params] as const,
  guarantees: (params: PaginationParams) => [...treasuryKeys.all, 'bank-guarantees', params] as const,
  forecasts: () => [...treasuryKeys.all, 'cash-forecasts'] as const,
  fx: () => [...treasuryKeys.all, 'fx-exposures'] as const,
};

export function useBankAccounts(params: PaginationParams) {
  return useQuery({
    queryKey: treasuryKeys.bankAccounts(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/treasury/bank-accounts?${qs}`);
      return { items: bankAccountSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { legalEntityId: string; bankCode: string; bankName: string; accountNumber: string; accountName: string; currency?: string; openingBalance?: number }) => {
      const parsed = createBankAccountSchema.parse(input);
      return postJson<unknown>('/treasury/bank-accounts', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: treasuryKeys.all }),
  });
}

export function useCashPosition() {
  return useQuery({
    queryKey: treasuryKeys.cashPosition(),
    queryFn: async () => {
      const data = await getJson<unknown>('/treasury/cash-position');
      return cashPositionSchema.parse(data);
    },
  });
}

export function usePaymentProposals(params: PaginationParams) {
  return useQuery({
    queryKey: treasuryKeys.proposals(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/treasury/payment-proposals?${qs}`);
      return { items: paymentProposalSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreatePaymentProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { legalEntityId: string; vendor: string; totalAmount: number; bankAccountId?: string; currency?: string; invoiceIds?: string[] }) => {
      const parsed = createPaymentProposalSchema.parse(input);
      return postJson<unknown>('/treasury/payment-proposals', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: treasuryKeys.all }),
  });
}

function useProposalAction(action: 'submit' | 'approve' | 'release') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/treasury/payment-proposals/${id}/${action}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: treasuryKeys.all }),
  });
}

export const useSubmitProposal = () => useProposalAction('submit');
export const useApproveProposal = () => useProposalAction('approve');
export const useReleaseProposal = () => useProposalAction('release');

export function useBankGuarantees(params: PaginationParams) {
  return useQuery({
    queryKey: treasuryKeys.guarantees(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/treasury/bank-guarantees?${qs}`);
      return { items: bankGuaranteeSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateBankGuarantee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { legalEntityId: string; projectId?: string; guaranteeType?: string; beneficiary: string; bankName: string; amount: number; currency?: string; expiryDate?: string }) => {
      const parsed = createBankGuaranteeSchema.parse(input);
      return postJson<unknown>('/treasury/bank-guarantees', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: treasuryKeys.all }),
  });
}

export function useCashForecasts() {
  return useQuery({
    queryKey: treasuryKeys.forecasts(),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>('/treasury/cash-forecasts');
      return { items: cashForecastSchema.array().parse(data.items) };
    },
  });
}

export function useCreateCashForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { legalEntityId: string; period: string; expectedReceipt?: number; expectedAp?: number; expectedPayroll?: number; expectedLoan?: number; expectedTax?: number; projectCashFlow?: number }) => {
      const parsed = createCashForecastSchema.parse(input);
      return postJson<unknown>('/treasury/cash-forecasts', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: treasuryKeys.all }),
  });
}

export function useFxExposures() {
  return useQuery({
    queryKey: treasuryKeys.fx(),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>('/treasury/fx-exposures');
      return { items: fxExposureSchema.array().parse(data.items) };
    },
  });
}

export function useCreateFxExposure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { legalEntityId: string; currency: string; exposureAmount: number; rate?: number; baseCurrency?: string }) => {
      const parsed = createFxExposureSchema.parse(input);
      return postJson<unknown>('/treasury/fx-exposures', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: treasuryKeys.all }),
  });
}
