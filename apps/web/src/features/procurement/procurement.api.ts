import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPrSchema,
  createQuoteSchema,
  createRfqSchema,
  purchaseOrderSchema,
  purchaseRequisitionSchema,
  rfqSchema,
  type CreatePr,
  type CreatePo,
  type CreateQuote,
  type CreateRfq,
  type PurchaseOrder,
  type PurchaseRequisition,
  type Rfq,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const prKeys = { all: ['pr'] as const, list: (params: object) => [...prKeys.all, 'list', params] as const };
export const poKeys = { all: ['po'] as const, list: (params: object) => [...poKeys.all, 'list', params] as const };
export const rfqKeys = { all: ['rfq'] as const, list: (params: object) => [...rfqKeys.all, 'list', params] as const };

export function usePrs(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: prKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/purchase-requisitions?${qs}`);
      return {
        items: purchaseRequisitionSchema.array().parse(data.items),
        total: data.total,
      };
    },
  });
}

export function useCreatePr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePr) => {
      const parsed = createPrSchema.parse(input);
      return postJson<unknown>('/purchase-requisitions', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: prKeys.all }),
  });
}

export function usePos(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: poKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/purchase-orders?${qs}`);
      return {
        items: purchaseOrderSchema.array().parse(data.items),
        total: data.total,
      };
    },
  });
}

export function useCreatePo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePo) => postJson<unknown>('/purchase-orders', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: poKeys.all }),
  });
}

export function useReleasePo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/purchase-orders/${id}/release`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: poKeys.all }),
  });
}

export function useRfqs(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: rfqKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/rfqs?${qs}`);
      return { items: rfqSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRfq) => {
      const parsed = createRfqSchema.parse(input);
      return postJson<unknown>('/rfqs', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: rfqKeys.all }),
  });
}

export function useSendRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/rfqs/${id}/send`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: rfqKeys.all }),
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rfqId, input }: { rfqId: string; input: CreateQuote }) => {
      const parsed = createQuoteSchema.parse(input);
      return postJson<unknown>(`/rfqs/${rfqId}/quotes`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: rfqKeys.all }),
  });
}

export function useEvaluateRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/rfqs/${id}/evaluate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: rfqKeys.all }),
  });
}

export type { CreateQuote, PurchaseRequisition, PurchaseOrder, Rfq };
