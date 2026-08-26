import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDeliverableSchema, deliverableSchema, createDrawingSchema, drawingSchema,
  createRfiSchema, rfiSchema, createSubmittalSchema, submittalSchema,
  createTransmittalSchema, transmittalSchema,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const engKeys = {
  all: ['engineering'] as const,
  deliverables: (params: object) => [...engKeys.all, 'deliverables', params] as const,
  drawings: (params: object) => [...engKeys.all, 'drawings', params] as const,
  rfis: (params: object) => [...engKeys.all, 'rfis', params] as const,
  submittals: (params: object) => [...engKeys.all, 'submittals', params] as const,
  transmittals: (params: object) => [...engKeys.all, 'transmittals', params] as const,
};

export function useDeliverables(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: engKeys.deliverables(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/engineering/deliverables?${qs}`);
      return { items: deliverableSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; discipline?: string; engineer: string; plannedDate?: string }) => {
      const parsed = createDeliverableSchema.parse(input);
      return postJson<unknown>('/engineering/deliverables', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: engKeys.all }),
  });
}

export function useUpdateDeliverableStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => postJson<unknown>(`/engineering/deliverables/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: engKeys.all }),
  });
}

export function useDrawings(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: engKeys.drawings(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/engineering/drawings?${qs}`);
      return { items: drawingSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateDrawing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; discipline?: string }) => {
      const parsed = createDrawingSchema.parse(input);
      return postJson<unknown>('/engineering/drawings', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: engKeys.all }),
  });
}

export function usePublishDrawing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revision }: { id: string; revision?: string }) => postJson<unknown>(`/engineering/drawings/${id}/publish`, { revision }),
    onSuccess: () => qc.invalidateQueries({ queryKey: engKeys.all }),
  });
}

export function useRfis(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: engKeys.rfis(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/engineering/rfis?${qs}`);
      return { items: rfiSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateRfi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; question: string }) => {
      const parsed = createRfiSchema.parse(input);
      return postJson<unknown>('/engineering/rfis', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: engKeys.all }),
  });
}

export function useAnswerRfi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, answer, impactCost, impactScheduleDays }: { id: string; answer: string; impactCost?: number; impactScheduleDays?: number }) =>
      postJson<unknown>(`/engineering/rfis/${id}/answer`, { answer, impactCost, impactScheduleDays }),
    onSuccess: () => qc.invalidateQueries({ queryKey: engKeys.all }),
  });
}

export function useSubmittals(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: engKeys.submittals(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/engineering/submittals?${qs}`);
      return { items: submittalSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateSubmittal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; dueDate?: string }) => {
      const parsed = createSubmittalSchema.parse(input);
      return postJson<unknown>('/engineering/submittals', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: engKeys.all }),
  });
}

export function useReviewSubmittal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => postJson<unknown>(`/engineering/submittals/${id}/review`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: engKeys.all }),
  });
}

export function useTransmittals(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: engKeys.transmittals(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      const data = await getJson<{ items: unknown; total: number }>(`/engineering/transmittals?${qs}`);
      return { items: transmittalSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateTransmittal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { recipient: string; subject: string; documentList?: string }) => {
      const parsed = createTransmittalSchema.parse(input);
      return postJson<unknown>('/engineering/transmittals', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: engKeys.all }),
  });
}
