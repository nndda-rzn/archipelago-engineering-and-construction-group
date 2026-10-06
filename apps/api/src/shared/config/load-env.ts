import { config as loadDotenv } from 'dotenv';

/**
 * Apakah `.env` boleh menimpa variabel yang sudah ada di environment?
 *
 * Hanya **development**. Di `test` dan `production`, env yang disuntikkan
 * platform (CI, container, orchestrator) harus tetap menang.
 */
export function shouldOverrideFromDotenv(nodeEnv: string | undefined): boolean {
  // String kosong diperlakukan seperti "tidak di-set".
  return (nodeEnv || 'development') === 'development';
}

/**
 * Muat `.env` dengan presedensi yang benar.
 *
 * `dotenv` bawaan **tidak** menimpa variabel yang sudah ada. Di development itu
 * berbahaya: satu `DATABASE_URL` global dari proyek lain (mis. di level User
 * Windows) akan membuat `.env` proyek ini diabaikan, dan API diam-diam menunjuk
 * database yang salah — gejalanya `ECONNREFUSED` / HTTP 503 yang membingungkan.
 *
 * Karena itu di development `.env` proyek **menang** (`override: true`).
 * Di test/production tetap tidak menimpa, supaya konfigurasi dari CI/container
 * tidak tertimpa file yang ikut ter-commit.
 *
 * @returns path `.env` yang benar-benar dipakai, atau `undefined` bila tak ada.
 */
export function loadEnvFile(): string | undefined {
  const result = loadDotenv({
    override: shouldOverrideFromDotenv(process.env.NODE_ENV),
    quiet: true,
  });
  // `DotenvConfigOutput` hanya menjamin `parsed`/`error`; `path` tidak ada di
  // tipenya. Kembalikan path eksplisit bila parsing berhasil.
  return result.error ? undefined : result.parsed ? '.env' : undefined;
}
