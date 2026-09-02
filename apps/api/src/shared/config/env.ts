import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default('*'),
  TRUST_PROXY: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  THROTTLE_TTL: z.coerce.number().int().min(1).default(60),
  THROTTLE_LIMIT: z.coerce.number().int().min(1).default(100),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}
