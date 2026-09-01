import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  equipmentSchema, createEquipmentSchema, equipmentAssignmentSchema,
  equipmentUtilizationSchema, equipmentPmSchema, equipmentBreakdownSchema,
  equipmentUsageSchema, createEquipmentUsageSchema,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const equipmentKeys = {
  all: ['hcm-equipment'] as const,
  list: (params: PaginationParams & { status?: string }) => [...equipmentKeys.all, 'list', params] as const,
  detail: (id: string, kind: string) => [...equipmentKeys.all, 'detail', id, kind] as const,
};

export function useEquipment(params: PaginationParams & { status?: string }) {
  return useQuery({
    queryKey: equipmentKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.status) qs.set('status', params.status);
      const data = await getJson<{ items: unknown; total: number }>(`/equipment?${qs}`);
      return { items: equipmentSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; category?: string; serialNumber?: string; owner?: string }) => {
      const parsed = createEquipmentSchema.parse(input);
      return postJson<unknown>('/equipment', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}

export function useEquipmentAssignments(equipmentId: string) {
  return useQuery({
    queryKey: equipmentKeys.detail(equipmentId, 'assignments'),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>(`/equipment/${equipmentId}/assignments`);
      return { items: equipmentAssignmentSchema.array().parse(data.items) };
    },
    enabled: Boolean(equipmentId),
  });
}

export function useCreateEquipmentAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { equipmentId: string; projectId: string }) =>
      postJson<unknown>(`/equipment/${input.equipmentId}/assignments`, { projectId: input.projectId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}

export function useEndEquipmentAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ equipmentId, assignmentId }: { equipmentId: string; assignmentId: string }) =>
      postJson<unknown>(`/equipment/${equipmentId}/assignments/${assignmentId}/end`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}

export function useEquipmentUtilizations(equipmentId: string) {
  return useQuery({
    queryKey: equipmentKeys.detail(equipmentId, 'utilizations'),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>(`/equipment/${equipmentId}/utilizations`);
      return { items: equipmentUtilizationSchema.array().parse(data.items) };
    },
    enabled: Boolean(equipmentId),
  });
}

export function useCreateEquipmentUtilization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { equipmentId: string; availableHours: number; operatingHours: number; projectId?: string }) =>
      postJson<unknown>(`/equipment/${input.equipmentId}/utilizations`, { availableHours: input.availableHours, operatingHours: input.operatingHours, projectId: input.projectId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}

export function useEquipmentPms(equipmentId: string) {
  return useQuery({
    queryKey: equipmentKeys.detail(equipmentId, 'pms'),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>(`/equipment/${equipmentId}/pms`);
      return { items: equipmentPmSchema.array().parse(data.items) };
    },
    enabled: Boolean(equipmentId),
  });
}

export function useCreateEquipmentPm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { equipmentId: string; triggerType?: string; dueDate?: string; dueMeter?: number; description?: string }) =>
      postJson<unknown>(`/equipment/${input.equipmentId}/pms`, { triggerType: input.triggerType, dueDate: input.dueDate, dueMeter: input.dueMeter, description: input.description }),
    onSuccess: () => qc.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}

export function useCompleteEquipmentPm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ equipmentId, pmId }: { equipmentId: string; pmId: string }) =>
      postJson<unknown>(`/equipment/${equipmentId}/pms/${pmId}/complete`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}

export function useEquipmentBreakdowns(equipmentId: string) {
  return useQuery({
    queryKey: equipmentKeys.detail(equipmentId, 'breakdowns'),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>(`/equipment/${equipmentId}/breakdowns`);
      return { items: equipmentBreakdownSchema.array().parse(data.items) };
    },
    enabled: Boolean(equipmentId),
  });
}

export function useCreateEquipmentBreakdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { equipmentId: string; downtimeHours: number; costImpact?: number; description?: string }) =>
      postJson<unknown>(`/equipment/${input.equipmentId}/breakdowns`, { downtimeHours: input.downtimeHours, costImpact: input.costImpact, description: input.description }),
    onSuccess: () => qc.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}

export function useResolveEquipmentBreakdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ equipmentId, breakdownId }: { equipmentId: string; breakdownId: string }) =>
      postJson<unknown>(`/equipment/${equipmentId}/breakdowns/${breakdownId}/resolve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}

export function useEquipmentUsages(equipmentId: string) {
  return useQuery({
    queryKey: equipmentKeys.detail(equipmentId, 'usages'),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>(`/equipment/${equipmentId}/usages`);
      return { items: equipmentUsageSchema.array().parse(data.items) };
    },
    enabled: Boolean(equipmentId),
  });
}

export function useCreateEquipmentUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { equipmentId: string; projectId: string; hours: number; costAmount: number; description?: string }) => {
      const parsed = createEquipmentUsageSchema.parse(input);
      return postJson<unknown>(`/equipment/${input.equipmentId}/usages`, parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}
