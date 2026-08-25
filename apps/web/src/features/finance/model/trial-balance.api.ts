import { useQuery } from '@tanstack/react-query';
import { trialBalanceSchema } from '@aec/api-contracts';
import { getJson } from '@/shared/lib/http';

export const tbKeys = { all: ['trial-balance'] as const, get: (params: object) => [...tbKeys.all, 'get', params] as const };

export function useTrialBalance(params: { legalEntityId?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: tbKeys.get(params),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.legalEntityId) qs.set('legalEntityId', params.legalEntityId);
      if (params.from) qs.set('from', params.from);
      if (params.to) qs.set('to', params.to);
      const data = await getJson<unknown>(`/gl/trial-balance?${qs}`);
      return trialBalanceSchema.parse(data);
    },
    enabled: !!params.legalEntityId,
  });
}