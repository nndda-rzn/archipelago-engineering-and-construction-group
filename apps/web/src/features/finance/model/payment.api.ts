import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPaymentSchema, paymentSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const payKeys = { all: ['payments'] as const, list: (params: PaginationParams) => [...payKeys.all, 'list', params] as const };

export function usePayments(params: PaginationParams) {
  return useQuery({
    queryKey: payKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/payments?${qs}`);
      return { items: paymentSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; vendor: string; bankAccount?: string; reference?: string; remark?: string; items: { invoiceId: string; amount: number }[] }) => {
      const parsed = createPaymentSchema.parse(input);
      return postJson<unknown>('/payments', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: payKeys.all }),
  });
}

export function useApprovePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/payments/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: payKeys.all }),
  });
}

export function usePayPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/payments/${id}/pay`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: payKeys.all }),
  });
}