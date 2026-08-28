import { useQuery } from '@tanstack/react-query';
import { auditLogListResponseSchema } from '@aec/api-contracts';
import { getJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const auditKeys = {
  all: ['audit-logs'] as const,
  list: (params: PaginationParams) => [...auditKeys.all, 'list', params] as const,
};

export function useAuditLogs(params: PaginationParams) {
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
