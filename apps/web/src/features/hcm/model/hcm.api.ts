import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEmployeeSchema, employeeSchema, projectAssignmentSchema, timesheetSchema, createTimesheetSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const hcmKeys = {
  employees: ['hcm-employees'] as const,
  employeeList: (params: object) => [...hcmKeys.employees, 'list', params] as const,
  assignments: (id: string) => [...hcmKeys.employees, 'assignments', id] as const,
  timesheets: ['hcm-timesheets'] as const,
  timesheetList: (params: object) => [...hcmKeys.timesheets, 'list', params] as const,
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
