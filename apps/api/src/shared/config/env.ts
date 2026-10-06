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

/** Kunci yang, bila sudah ada di environment, akan MENGALAHKAN isi file `.env`. */
const OVERRIDABLE_KEYS = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'CORS_ORIGIN', 'PORT'] as const;

/**
 * Sebutkan host/port/nama database dari `DATABASE_URL` untuk baris log — tanpa
 * pernah membocorkan password. `null` bila URL tidak bisa di-parse (tidak melempar).
 */
export function describeDatabaseTarget(url: string): { host: string; port: string; database: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, '');
    return { host: parsed.hostname, port: parsed.port || '(default)', database };
  } catch {
    return null;
  }
}

/**
 * Kunci mana saja yang sudah ada di `process.env` sehingga akan MENANG atas
 * `.env`. `dotenv` tidak menimpa variabel yang sudah ada, jadi env var global
 * (mis. milik proyek lain) bisa diam-diam mengarahkan API ke database yang salah.
 * Dipakai untuk memperingatkan saat boot.
 */
export function describeEnvOverrides(raw: NodeJS.ProcessEnv): string[] {
  return OVERRIDABLE_KEYS.filter((key) => raw[key] != null && raw[key] !== '');
}

export function validateEnv(raw: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}
