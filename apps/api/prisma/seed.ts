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
  ['Audit.VIEW', 'Audit', 'VIEW'],
  ['Project.VIEW', 'Project', 'VIEW'],
  ['Project.CREATE', 'Project', 'CREATE'],
  ['Project.EDIT', 'Project', 'EDIT'],
  ['WBS.VIEW', 'WBS', 'VIEW'],
  ['WBS.CREATE', 'WBS', 'CREATE'],
  ['WBS.EDIT', 'WBS', 'EDIT'],
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

  // Demo project + WBS (PRD §46.4)
  const demoProject = await prisma.project.upsert({
    where: { code: 'PRJ-EPC-2027-014' },
    update: {},
    create: {
      code: 'PRJ-EPC-2027-014',
      name: 'EPC Industrial Processing Facility',
      client: 'PT Klien Utama',
      legalEntityId: entity.id,
      location: 'Karawang',
      currency: 'IDR',
    },
  });

  const wbsLevels = [
    { code: '1', name: 'Engineering' },
    { code: '2', name: 'Procurement' },
    { code: '3', name: 'Construction' },
    { code: '4', name: 'Commissioning' },
  ];
  for (const w of wbsLevels) {
    await prisma.wbsItem.upsert({
      where: { projectId_code: { projectId: demoProject.id, code: w.code } },
      update: {},
      create: { projectId: demoProject.id, code: w.code, name: w.name, sortOrder: Number(w.code) },
    });
  }

  console.log(
    `Seeded ${entity.code}, ${role.code}, ${admin.email}, ${demoProject.code} + ${wbsLevels.length} WBS`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
