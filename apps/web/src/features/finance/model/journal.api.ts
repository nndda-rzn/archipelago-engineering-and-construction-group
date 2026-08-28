import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createJournalSchema, journalSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';
import { type PaginationParams } from '@/shared/lib/pagination';

export const jrnKeys = { all: ['journals'] as const, list: (params: PaginationParams & { source?: string; status?: string }) => [...jrnKeys.all, 'list', params] as const };

export function useJournals(params: PaginationParams & { source?: string; status?: string }) {
  return useQuery({
    queryKey: jrnKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.source) qs.set('source', params.source);
      if (params.status) qs.set('status', params.status);
      const data = await getJson<{ items: unknown; total: number }>(`/journals?${qs}`);
      return { items: journalSchema.array().parse(data.items), total: data.total };
    },
  });
}

export function useCreateJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { legalEntityId: string; date?: string; description: string; reference?: string; lines: { accountId: string; description?: string; debit: number; credit: number; projectId?: string; wbsItemId?: string }[] }) => {
      const parsed = createJournalSchema.parse(input);
      return postJson<unknown>('/journals', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: jrnKeys.all }),
  });
}

export function usePostJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postJson<unknown>(`/journals/${id}/post`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: jrnKeys.all }),
  });
}