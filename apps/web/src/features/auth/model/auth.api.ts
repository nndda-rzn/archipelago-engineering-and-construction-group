import { useMutation } from '@tanstack/react-query';
import { loginResponseSchema } from '@aec/api-contracts';
import { postJson, setToken } from '@/shared/lib/http';

export const authKeys = {
  all: ['auth'] as const,
};

export function useLogin() {
  return useMutation({
    mutationKey: [...authKeys.all, 'login'],
    mutationFn: async (input: { email: string; password: string }) => {
      const data = await postJson<unknown>('/auth/login', input);
      const parsed = loginResponseSchema.parse(data);
      setToken(parsed.accessToken);
      return parsed;
    },
  });
}
