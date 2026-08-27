import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createObservationSchema, safetyObservationSchema, createIncidentSchema, hseIncidentSchema,
  createPermitSchema, permitToWorkSchema, createCorrectiveActionSchema,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const hseKeys = {
  all: ['hse'] as const,
  observations: (params: object) => [...hseKeys.all, 'observations', params] as const,
  incidents: (params: object) => [...hseKeys.all, 'incidents', params] as const,
  permits: (params: object) => [...hseKeys.all, 'permits', params] as const,
};

export function useObservations(params: { page: number; pageSize: number; status?: string }) {
  return useQuery({
    queryKey: hseKeys.observations(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.status) qs.set('status', params.status);
      const data = await getJson<{ items: unknown; total: number }>(`/hse/observations?${qs}`);
      return { items: safetyObservationSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId?: string; type?: string; description: string }) => {
      const parsed = createObservationSchema.parse(input);
      return postJson<unknown>('/hse/observations', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hseKeys.all }),
  });
}

export function useResolveObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => postJson<unknown>(`/hse/observations/${id}/resolve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: hseKeys.all }),
  });
}

export function useIncidents(params: { page: number; pageSize: number; status?: string; severity?: string }) {
  return useQuery({
    queryKey: hseKeys.incidents(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.status) qs.set('status', params.status);
      if (params.severity) qs.set('severity', params.severity);
      const data = await getJson<{ items: unknown; total: number }>(`/hse/incidents?${qs}`);
      return { items: hseIncidentSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId?: string; type?: string; severity?: string; description: string }) => {
      const parsed = createIncidentSchema.parse(input);
      return postJson<unknown>('/hse/incidents', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hseKeys.all }),
  });
}

export function useInvestigateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rootCause }: { id: string; rootCause: string }) => postJson<unknown>(`/hse/incidents/${id}/investigate`, { rootCause }),
    onSuccess: () => qc.invalidateQueries({ queryKey: hseKeys.all }),
  });
}

export function useResolveIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => postJson<unknown>(`/hse/incidents/${id}/resolve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: hseKeys.all }),
  });
}

export function useCreateCorrectiveAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { sourceType: string; sourceId: string; action: string; owner: string; dueDate: string }) => {
      const parsed = createCorrectiveActionSchema.parse(input);
      return postJson<unknown>('/hse/corrective-actions', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hseKeys.all }),
  });
}

export function useVerifyCorrectiveAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, evidence }: { id: string; evidence?: string }) => postJson<unknown>(`/hse/corrective-actions/${id}/verify`, { evidence }),
    onSuccess: () => qc.invalidateQueries({ queryKey: hseKeys.all }),
  });
}

export function usePermits(params: { page: number; pageSize: number; status?: string }) {
  return useQuery({
    queryKey: hseKeys.permits(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.status) qs.set('status', params.status);
      const data = await getJson<{ items: unknown; total: number }>(`/hse/permits?${qs}`);
      return { items: permitToWorkSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreatePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId?: string; area: string; validFrom: string; validTo: string; issuedTo: string; description?: string }) => {
      const parsed = createPermitSchema.parse(input);
      return postJson<unknown>('/hse/permits', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hseKeys.all }),
  });
}

export function useRevokePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => postJson<unknown>(`/hse/permits/${id}/revoke`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: hseKeys.all }),
  });
}
