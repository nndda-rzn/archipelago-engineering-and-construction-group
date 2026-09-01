import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { payrollAllocationSchema, createPayrollAllocationSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const payrollKeys = {
  all: ['hcm-payroll'] as const,
  list: (params: PaginationParams & { period?: string }) => [...payrollKeys.all, 'list', params] as const,
};

export function usePayrollAllocations(params: PaginationParams & { period?: string }) {
  return useQuery({
    queryKey: payrollKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.period) qs.set('period', params.period);
      const data = await getJson<{ items: unknown; total: number }>(`/payroll-allocations?${qs}`);
      return { items: payrollAllocationSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreatePayrollAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { employeeId: string; projectId?: string; period: string; grossAmount: number; projectAmount: number; overheadAmount: number }) => {
      const parsed = createPayrollAllocationSchema.parse(input);
      return postJson<unknown>('/payroll-allocations', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}
