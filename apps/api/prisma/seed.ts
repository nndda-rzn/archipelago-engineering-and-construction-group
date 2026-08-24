import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const permissions = [
  ['LegalEntity.VIEW', 'LegalEntity', 'VIEW'],
  ['LegalEntity.CREATE', 'LegalEntity', 'CREATE'],
  ['LegalEntity.EDIT', 'LegalEntity', 'EDIT'],
  ['LegalEntity.BLOCK', 'LegalEntity', 'BLOCK'],
  ['User.VIEW', 'User', 'VIEW'],
  ['User.CREATE', 'User', 'CREATE'],
  ['User.BLOCK', 'User', 'BLOCK'],
  ['Role.VIEW', 'Role', 'VIEW'],
  ['Role.CREATE', 'Role', 'CREATE'],
  ['Role.EDIT', 'Role', 'EDIT'],
] as const;

async function main() {
  const entity = await prisma.legalEntity.upsert({
    where: { code: 'AEC-CON' },
    update: {},
    create: {
      code: 'AEC-CON',
      legalName: 'PT AEC Construction',
      taxIdentifier: '00.000.000.0-000.000',
      country: 'ID',
    },
  });

  const role = await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: { code: 'SUPER_ADMIN', name: 'Super Administrator' },
  });

  for (const [code, resource, action] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, resource, action },
    });
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId_scopeType_scopeValue: {
          roleId: role.id,
          permissionId: permission.id,
          scopeType: 'GLOBAL',
          scopeValue: '',
        },
      },
      update: {},
      create: { roleId: role.id, permissionId: permission.id, scopeType: 'GLOBAL', scopeValue: '' },
    });
  }

  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aec.local' },
    update: { passwordHash, legalEntityId: entity.id, status: 'ACTIVE' },
    create: {
      username: 'admin',
      email: 'admin@aec.local',
      displayName: 'AEC Administrator',
      passwordHash,
      legalEntityId: entity.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId_effectiveFrom: {
        userId: admin.id,
        roleId: role.id,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
    update: { effectiveTo: null },
    create: {
      userId: admin.id,
      roleId: role.id,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  console.log(`Seeded ${entity.code}, ${role.code}, ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
