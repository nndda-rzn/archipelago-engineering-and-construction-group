import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timesheetSchema, createTimesheetSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const timesheetKeys = {
  all: ['hcm-timesheets'] as const,
  list: (params: PaginationParams & { status?: string }) => [...timesheetKeys.all, 'list', params] as const,
};

export function useTimesheets(params: PaginationParams & { status?: string }) {
  return useQuery({
    queryKey: timesheetKeys.list(params),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: timesheetKeys.all }),
  });
}

export function useApproveTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status?: string }) => postJson<unknown>(`/timesheets/${id}/approve`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: timesheetKeys.all }),
  });
}
