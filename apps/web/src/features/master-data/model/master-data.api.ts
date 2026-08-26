import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createVendorSchema, vendorSchema, createFiscalPeriodSchema, fiscalPeriodSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const mdKeys = {
  all: ['master-data'] as const,
  vendors: (params: object) => [...mdKeys.all, 'vendors', params] as const,
  periods: (params: object) => [...mdKeys.all, 'periods', params] as const,
};

export function useVendors(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: mdKeys.vendors(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/vendors?${qs}`);
      return { items: vendorSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; taxId?: string; category?: string; contactPerson?: string; email?: string; phone?: string }) => {
      const parsed = createVendorSchema.parse(input);
      return postJson<unknown>('/vendors', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mdKeys.all }),
  });
}

export function useFiscalPeriods(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: mdKeys.periods(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/fiscal-periods?${qs}`);
      return { items: fiscalPeriodSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateFiscalPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { periodCode: string; periodYear: number; periodMonth: number; startDate: string; endDate: string }) => {
      const parsed = createFiscalPeriodSchema.parse(input);
      return postJson<unknown>('/fiscal-periods', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mdKeys.all }),
  });
}

export function useUpdateFiscalPeriodStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => postJson<unknown>(`/fiscal-periods/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: mdKeys.all }),
  });
}
