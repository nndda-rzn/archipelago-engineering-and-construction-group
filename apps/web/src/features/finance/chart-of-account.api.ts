import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chartOfAccountSchema, createChartOfAccountSchema } from '@aec/api-contracts';
import { getJson, postJson } from '@/shared/lib/http';

export const coaKeys = { all: ['chart-of-accounts'] as const, list: (params: object) => [...coaKeys.all, 'list', params] as const };

export function useChartOfAccounts(params: { legalEntityId?: string }) {
  return useQuery({
    queryKey: coaKeys.list(params),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.legalEntityId) qs.set('legalEntityId', params.legalEntityId);
      const data = await getJson<unknown[]>(`/chart-of-accounts?${qs}`);
      return chartOfAccountSchema.array().parse(data);
    },
  });
}

export function useCreateChartOfAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { legalEntityId: string; code: string; name: string; accountType?: string; normalBalance?: string; parentId?: string; description?: string }) => {
      const parsed = createChartOfAccountSchema.parse(input);
      return postJson<unknown>('/chart-of-accounts', parsed);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: coaKeys.all }),
  });
}