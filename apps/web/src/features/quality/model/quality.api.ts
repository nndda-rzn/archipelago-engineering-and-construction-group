import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createItpSchema, itpSchema, createInspectionSchema, inspectionRequestSchema,
  createNcrSchema, ncrSchema, createPunchItemSchema, punchListItemSchema,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const qualityKeys = {
  all: ['quality'] as const,
  itps: (params: PaginationParams) => [...qualityKeys.all, 'itps', params] as const,
  inspections: (params: PaginationParams) => [...qualityKeys.all, 'inspections', params] as const,
  ncrs: (params: PaginationParams) => [...qualityKeys.all, 'ncrs', params] as const,
  punch: (params: PaginationParams) => [...qualityKeys.all, 'punch', params] as const,
};

export function useItps(params: PaginationParams) {
  return useQuery({
    queryKey: qualityKeys.itps(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/quality/itps?${qs}`);
      return { items: itpSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateItp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { workPackageId?: string; title: string; description?: string }) => {
      const parsed = createItpSchema.parse(input);
      return postJson<unknown>('/quality/itps', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qualityKeys.all }),
  });
}

export function useInspections(params: PaginationParams) {
  return useQuery({
    queryKey: qualityKeys.inspections(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/quality/inspections?${qs}`);
      return { items: inspectionRequestSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { workPackageId?: string; description: string }) => {
      const parsed = createInspectionSchema.parse(input);
      return postJson<unknown>('/quality/inspections', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qualityKeys.all }),
  });
}

export function useInspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, result }: { id: string; result: string }) => postJson<unknown>(`/quality/inspections/${id}/inspect`, { result }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qualityKeys.all }),
  });
}

export function useNcrs(params: PaginationParams) {
  return useQuery({
    queryKey: qualityKeys.ncrs(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/quality/ncrs?${qs}`);
      return { items: ncrSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateNcr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { workPackageId?: string; category?: string; severity?: string; description: string }) => {
      const parsed = createNcrSchema.parse(input);
      return postJson<unknown>('/quality/ncrs', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qualityKeys.all }),
  });
}

export function useDisposeNcr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rootCause, correctiveAction }: { id: string; rootCause?: string; correctiveAction?: string }) =>
      postJson<unknown>(`/quality/ncrs/${id}/dispose`, { rootCause, correctiveAction }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qualityKeys.all }),
  });
}

export function useReinspectNcr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, result }: { id: string; result: string }) => postJson<unknown>(`/quality/ncrs/${id}/reinspect`, { result }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qualityKeys.all }),
  });
}

export function usePunchItems(params: PaginationParams) {
  return useQuery({
    queryKey: qualityKeys.punch(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/quality/punch-items?${qs}`);
      return { items: punchListItemSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreatePunchItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { workPackageId?: string; description: string }) => {
      const parsed = createPunchItemSchema.parse(input);
      return postJson<unknown>('/quality/punch-items', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qualityKeys.all }),
  });
}

export function useClosePunchItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => postJson<unknown>(`/quality/punch-items/${id}/close`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: qualityKeys.all }),
  });
}
