import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createVendorSchema, vendorSchema, vendorStatsSchema, vendorDetailSchema,
  createFiscalPeriodSchema, fiscalPeriodSchema, numberSequenceSchema,
  updateVendorSchema,
  type CreateVendor, type UpdateVendor,
} from '@aec/api-contracts';
import { getJson, patchJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export interface VendorListParams extends PaginationParams {
  search?: string;
  category?: string;
  status?: string;
}

export interface FiscalPeriodListParams extends PaginationParams {
  status?: string;
  periodYear?: number;
}

export const mdKeys = {
  all: ['master-data'] as const,
  vendors: (params: VendorListParams) => [...mdKeys.all, 'vendors', params] as const,
  vendorStats: () => [...mdKeys.all, 'vendors', 'stats'] as const,
  vendorDetail: (id: string) => [...mdKeys.all, 'vendors', 'detail', id] as const,
  periods: (params: FiscalPeriodListParams) => [...mdKeys.all, 'periods', params] as const,
  sequences: () => [...mdKeys.all, 'number-sequences'] as const,
};

function toQs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) search.set(k, String(v));
  }
  return search.toString();
}

export function useVendors(params: VendorListParams) {
  return useQuery({
    queryKey: mdKeys.vendors(params),
    queryFn: async () => {
      const qs = toQs({ page: params.page, pageSize: params.pageSize, search: params.search, category: params.category, status: params.status });
      const data = await getJson<{ items: unknown; total: number }>(`/vendors?${qs}`);
      return { items: vendorSchema.array().parse(data.items), total: data.total };
    },
    placeholderData: (prev) => prev,
  });
}

export function useVendorStats() {
  return useQuery({
    queryKey: mdKeys.vendorStats(),
    queryFn: async () => vendorStatsSchema.parse(await getJson<unknown>('/vendors/stats')),
  });
}

export function useVendorDetail(id: string) {
  return useQuery({
    queryKey: mdKeys.vendorDetail(id),
    queryFn: async () => vendorDetailSchema.parse(await getJson<unknown>(`/vendors/${id}`)),
    enabled: !!id,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVendor) => {
      const parsed = createVendorSchema.parse(input);
      return postJson<unknown>('/vendors', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mdKeys.all }),
  });
}

export function useUpdateVendor(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateVendor) => {
      const parsed = updateVendorSchema.parse(input);
      return patchJson<unknown>(`/vendors/${id}`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mdKeys.all }),
  });
}

export function useSetVendorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) => postJson<unknown>(`/vendors/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: mdKeys.all }),
  });
}

export function useFiscalPeriods(params: FiscalPeriodListParams) {
  return useQuery({
    queryKey: mdKeys.periods(params),
    queryFn: async () => {
      const qs = toQs({ page: params.page, pageSize: params.pageSize, status: params.status, periodYear: params.periodYear });
      const data = await getJson<{ items: unknown; total: number }>(`/fiscal-periods?${qs}`);
      return { items: fiscalPeriodSchema.array().parse(data.items), total: data.total };
    },
    placeholderData: (prev) => prev,
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

export function useNumberSequences() {
  return useQuery({
    queryKey: mdKeys.sequences(),
    queryFn: async () => {
      const data = await getJson<{ items: unknown; total: number }>('/number-sequences');
      return { items: numberSequenceSchema.array().parse(data.items), total: data.total };
    },
  });
}
