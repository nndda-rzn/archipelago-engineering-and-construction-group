import { useQuery } from '@tanstack/react-query';
import { auditLogListResponseSchema } from '@aec/api-contracts';
import { getJson } from '@/shared/lib/http';

export const auditKeys = {
  all: ['audit-logs'] as const,
  list: (params: { page: number; pageSize: number }) => [...auditKeys.all, 'list', params] as const,
};

export function useAuditLogs(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: async () => {
      const search = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
      });
      const data = await getJson<unknown>(`/audit-logs?${search.toString()}`);
      return auditLogListResponseSchema.parse(data);
    },
    placeholderData: (prev) => prev,
  });
}
