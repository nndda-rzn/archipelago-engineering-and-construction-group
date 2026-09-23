import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export default function globalSetup() {
  // HARUS sama dengan setup-env.ts: reset menyasar DB yang sama dengan yang dipakai test.
  // Sebelumnya globalSetup baca DATABASE_URL sedangkan setup-env baca TEST_DATABASE_URL —
  // bila keduanya berbeda (mis. DATABASE_URL dev di shell), reset tak menyentuh DB test
  // sehingga suite jalan di DB kotor -> 409 non-deterministik di lokal.
  const testDbUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://aec:aec_dev_password@localhost:5432/aec_test?schema=public';
  process.env.DATABASE_URL = testDbUrl;
  process.env.PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = 'Ya, reset aec_test';

  const prismaDir = join(__dirname, '..', 'prisma');
  if (!existsSync(join(prismaDir, 'schema.prisma'))) {
    throw new Error('prisma/schema.prisma tidak ditemukan');
  }

  execSync('npx prisma migrate reset --force', { stdio: 'inherit', env: process.env });
  execSync('npx prisma db seed', { stdio: 'inherit', env: process.env });
}