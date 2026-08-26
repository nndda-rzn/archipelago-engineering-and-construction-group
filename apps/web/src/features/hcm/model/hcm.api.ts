import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEmployeeSchema, employeeSchema, projectAssignmentSchema, timesheetSchema, createTimesheetSchema,
  equipmentSchema, createEquipmentSchema, equipmentAssignmentSchema, equipmentUtilizationSchema,
  equipmentPmSchema, equipmentBreakdownSchema, equipmentUsageSchema, createEquipmentUsageSchema,
} from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const hcmKeys = {
  employees: ['hcm-employees'] as const,
  employeeList: (params: object) => [...hcmKeys.employees, 'list', params] as const,
  assignments: (id: string) => [...hcmKeys.employees, 'assignments', id] as const,
  timesheets: ['hcm-timesheets'] as const,
  timesheetList: (params: object) => [...hcmKeys.timesheets, 'list', params] as const,
  equipment: ['hcm-equipment'] as const,
  equipmentList: (params: object) => [...hcmKeys.equipment, 'list', params] as const,
  equipmentDetail: (id: string, kind: string) => [...hcmKeys.equipment, 'detail', id, kind] as const,
};

export function useEmployees(params: { page: number; pageSize: number; status?: string }) {
  return useQuery({
    queryKey: hcmKeys.employeeList(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.status) qs.set('status', params.status);
      const data = await getJson<{ items: unknown; total: number }>(`/employees?${qs}`);
      return { items: employeeSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      legalEntityId: string;
      name: string;
      position: string;
      grade?: string;
      department?: string;
      location?: string;
      costCenter?: string;
      managerId?: string;
      joinDate?: string;
    }) => {
      const parsed = createEmployeeSchema.parse(input);
      return postJson<unknown>('/employees', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.employees }),
  });
}

export function useAssignments(employeeId: string) {
  return useQuery({
    queryKey: hcmKeys.assignments(employeeId),
    queryFn: async () => {
      const data = await getJson<{ items: unknown }>(`/employees/${employeeId}/assignments`);
      return { items: projectAssignmentSchema.array().parse(data.items) };
    },
    enabled: Boolean(employeeId),
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { employeeId: string; projectId: string; role?: string; allocationPercent: number; exceptionApproved?: boolean }) =>
      postJson<unknown>(`/employees/${input.employeeId}/assignments`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.employees }),
  });
}

export function useTimesheets(params: { page: number; pageSize: number; status?: string }) {
  return useQuery({
    queryKey: hcmKeys.timesheetList(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.status) qs.set('status', params.status);
      const data = await getJson<{ items: unknown; total: number }>(`/timesheets?${qs}`);
      return { items: timesheetSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { employeeId: string; projectId: string; wbsItemId?: string; workDate?: string; hours: number; activity?: string; description?: string }) => {
      const parsed = createTimesheetSchema.parse(input);
      return postJson<unknown>('/timesheets', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.timesheets }),
  });
}

export function useApproveTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status?: string }) => postJson<unknown>(`/timesheets/${id}/approve`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.timesheets }),
  });
}

export function useEquipment(params: { page: number; pageSize: number; status?: string }) {
  return useQuery({
    queryKey: hcmKeys.equipmentList(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.status) qs.set("status", params.status);
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
      return postJson<unknown>("/equipment", parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.equipment }),
  });
}

export function useEquipmentAssignments(equipmentId: string) {
  return useQuery({
    queryKey: hcmKeys.equipmentDetail(equipmentId, "assignments"),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.equipment }),
  });
}

export function useEndEquipmentAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ equipmentId, assignmentId }: { equipmentId: string; assignmentId: string }) =>
      postJson<unknown>(`/equipment/${equipmentId}/assignments/${assignmentId}/end`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.equipment }),
  });
}

export function useEquipmentUtilizations(equipmentId: string) {
  return useQuery({
    queryKey: hcmKeys.equipmentDetail(equipmentId, "utilizations"),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.equipment }),
  });
}

export function useEquipmentPms(equipmentId: string) {
  return useQuery({
    queryKey: hcmKeys.equipmentDetail(equipmentId, "pms"),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.equipment }),
  });
}

export function useCompleteEquipmentPm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ equipmentId, pmId }: { equipmentId: string; pmId: string }) =>
      postJson<unknown>(`/equipment/${equipmentId}/pms/${pmId}/complete`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.equipment }),
  });
}

export function useEquipmentBreakdowns(equipmentId: string) {
  return useQuery({
    queryKey: hcmKeys.equipmentDetail(equipmentId, "breakdowns"),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.equipment }),
  });
}

export function useResolveEquipmentBreakdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ equipmentId, breakdownId }: { equipmentId: string; breakdownId: string }) =>
      postJson<unknown>(`/equipment/${equipmentId}/breakdowns/${breakdownId}/resolve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.equipment }),
  });
}

export function useEquipmentUsages(equipmentId: string) {
  return useQuery({
    queryKey: hcmKeys.equipmentDetail(equipmentId, "usages"),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: hcmKeys.equipment }),
  });
}
