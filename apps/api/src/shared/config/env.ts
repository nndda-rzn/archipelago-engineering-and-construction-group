import { z } from 'zod';

/**
 * Env validation (fail fast) — validasi saat bootstrap.
 * Semua env wajib sesuai schema sebelum app jalan.
 */
export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}
