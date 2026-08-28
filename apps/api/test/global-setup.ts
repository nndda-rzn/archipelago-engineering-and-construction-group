import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export default function globalSetup() {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://aec:aec_dev_password@localhost:5432/aec_test?schema=public';
  process.env.PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = 'Ya, reset aec_test';

  const prismaDir = join(__dirname, '..', 'prisma');
  if (!existsSync(join(prismaDir, 'schema.prisma'))) {
    throw new Error('prisma/schema.prisma tidak ditemukan');
  }

  execSync('npx prisma migrate reset --force', { stdio: 'inherit', env: process.env });
  execSync('npx prisma db seed', { stdio: 'inherit', env: process.env });
}