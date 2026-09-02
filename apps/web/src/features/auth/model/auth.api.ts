import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { loginResponseSchema, meResponseSchema } from '@aec/api-contracts';
import { getJson, postJson, setToken, setStoredUser, getStoredUser, clearToken, clearSession } from '@/shared/lib/http';

export const authKeys = {
  all: ['auth'] as const,
  me: ['auth', 'me'] as const,
};

export function useLogin() {
  const router = useRouter();
  return useMutation({
    mutationKey: [...authKeys.all, 'login'],
    mutationFn: async (input: { email: string; password: string }) => {
      const data = await postJson<unknown>('/auth/login', input);
      const parsed = loginResponseSchema.parse(data);
      setToken(parsed.accessToken);
      setStoredUser(parsed.user);
      return parsed;
    },
    onSuccess: () => {
      void router.navigate({ to: '/' });
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      const data = await getJson<unknown>('/auth/me');
      const parsed = meResponseSchema.parse(data);
      setStoredUser(parsed);
      return parsed;
    },
    initialData: () => {
      const stored = getStoredUser();
      if (!stored) return undefined;
      try {
        return stored;
      } catch {
        return undefined;
      }
    },
    staleTime: 60_000,
  });
}

export function useLogout() {
  const router = useRouter();
  return () => {
    clearToken();
    clearSession();
    void router.navigate({ to: '/login' });
  };
}
