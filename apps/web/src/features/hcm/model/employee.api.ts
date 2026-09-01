import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeeSchema, createEmployeeSchema, projectAssignmentSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const employeeKeys = {
  all: ['hcm-employees'] as const,
  list: (params: PaginationParams & { status?: string }) => [...employeeKeys.all, 'list', params] as const,
  assignments: (id: string) => [...employeeKeys.all, 'assignments', id] as const,
};

export function useEmployees(params: PaginationParams & { status?: string }) {
  return useQuery({
    queryKey: employeeKeys.list(params),
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
    mutationFn: (input: { legalEntityId: string; name: string; position: string; grade?: string; department?: string; location?: string; costCenter?: string; managerId?: string; joinDate?: string }) => {
      const parsed = createEmployeeSchema.parse(input);
      return postJson<unknown>('/employees', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useAssignments(employeeId: string) {
  return useQuery({
    queryKey: employeeKeys.assignments(employeeId),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useChangeEmployeeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, leaveDate }: { id: string; status: string; leaveDate?: string }) =>
      postJson<unknown>(`/employees/${id}/status`, { status, leaveDate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}
