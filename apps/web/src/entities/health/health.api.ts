import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/shared/lib/http';
import type { HealthResponse } from '@aec/api-contracts';

/** Query key pattern per feature (Frontend-Architecture §6). */
export const healthKeys = {
  all: ['health'] as const,
  detail: () => [...healthKeys.all, 'detail'] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: healthKeys.detail(),
    queryFn: () => getJson<HealthResponse>('/health'),
  });
}
