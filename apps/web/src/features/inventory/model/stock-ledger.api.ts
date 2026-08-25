import { useQuery } from '@tanstack/react-query';
import { stockLedgerEntrySchema, stockSummarySchema } from '@aec/api-contracts';
import { getJson } from '@/shared/lib/http';

export const ledgerKeys = { all: ['stock-ledger'] as const, list: (params: object) => [...ledgerKeys.all, 'list', params] as const, summary: (projectId: string | null) => [...ledgerKeys.all, 'summary', projectId] as const };

export function useStockLedger(params: { page: number; pageSize: number; projectId?: string }) {
  return useQuery({
    queryKey: ledgerKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.projectId) qs.set('projectId', params.projectId);
      const data = await getJson<{ items: unknown; total: number }>(`/stock-ledger?${qs}`);
      return { items: stockLedgerEntrySchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useStockSummary(projectId: string | null) {
  return useQuery({
    queryKey: ledgerKeys.summary(projectId),
    queryFn: async () => {
      if (!projectId) return { projectId: '', items: [] };
      const data = await getJson<unknown>(`/projects/${projectId}/stock-summary`);
      return stockSummarySchema.parse(data);
    },
    enabled: !!projectId,
  });
}