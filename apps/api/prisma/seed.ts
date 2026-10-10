import { loadEnvFile } from '../src/shared/config/load-env';

// Muat .env dengan presedensi development-aware SEBELUM Prisma diinisialisasi.
loadEnvFile();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { Permission } from '@aec/shared-types';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Permission matrix - SATU sumber di @aec/shared-types. Bentuk [code, resource,
// action] diturunkan dari kode `Resource.ACTION`, jadi tidak bisa lagi berbeda
// dari yang dipakai controller backend.
const permissions = Object.values(Permission).map((code) => {
  const [resource, action] = code.split('.');
  return [code, resource, action] as const;
});

// ─── Seed functions ───────────────────────────────────────────────────────────

async function seedFoundation() {
  // Pastikan master Currency ada lebih dulu — kolom FK di LegalEntity menunjuk
  // ke sini, jadi entity hasil seed harus tertaut (bukan NULL).
  await prisma.currency.upsert({
    where: { code: 'IDR' },
    update: {},
    create: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 2 },
  });
  const idr = await prisma.currency.findUnique({ where: { code: 'IDR' } });

  const entity = await prisma.legalEntity.upsert({
    where: { code: 'AEC-CON' },
    update: { functionalCurrencyId: idr?.id ?? null, reportingCurrencyId: idr?.id ?? null },
    create: {
      code: 'AEC-CON',
      legalName: 'PT AEC Construction',
      taxIdentifier: '00.000.000.0-000.000',
      country: 'ID',
      functionalCurrencyId: idr?.id ?? null,
      reportingCurrencyId: idr?.id ?? null,
    },
  });
  console.log(`[foundation] Seeded legal entity: ${entity.code}`);
  return { entity };
}

async function seedPermissions(roleId: string) {
  for (const [code, resource, action] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, resource, action },
    });
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId_scopeType_scopeValue: {
          roleId,
          permissionId: permission.id,
          scopeType: 'GLOBAL',
          scopeValue: '',
        },
      },
      update: {},
      create: { roleId, permissionId: permission.id, scopeType: 'GLOBAL', scopeValue: '' },
    });
  }
  console.log(`[permissions] Seeded ${permissions.length} permissions → SUPER_ADMIN`);
}

async function seedUsers(entityId: string) {
  const superAdminRole = await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: { code: 'SUPER_ADMIN', name: 'Super Administrator' },
  });

  const buyerRole = await prisma.role.upsert({
    where: { code: 'BUYER' },
    update: {},
    create: { code: 'BUYER', name: 'Buyer', description: 'Membuat PR' },
  });

  const procManagerRole = await prisma.role.upsert({
    where: { code: 'PROCUREMENT_MANAGER' },
    update: {},
    create: { code: 'PROCUREMENT_MANAGER', name: 'Procurement Manager', description: 'Menyetujui PR/PO' },
  });

  // Seed permissions untuk SUPER_ADMIN
  await seedPermissions(superAdminRole.id);

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aec.local' },
    update: { passwordHash: adminHash, legalEntityId: entityId, status: 'ACTIVE' },
    create: { username: 'admin', email: 'admin@aec.local', displayName: 'AEC Administrator', passwordHash: adminHash, legalEntityId: entityId },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId_effectiveFrom: { userId: admin.id, roleId: superAdminRole.id, effectiveFrom: new Date('2026-01-01T00:00:00.000Z') } },
    update: { effectiveTo: null },
    create: { userId: admin.id, roleId: superAdminRole.id, effectiveFrom: new Date('2026-01-01T00:00:00.000Z') },
  });

  // Admin dapat bertindak sebagai PROCUREMENT_MANAGER (approver demo)
  await prisma.userRole.upsert({
    where: { userId_roleId_effectiveFrom: { userId: admin.id, roleId: procManagerRole.id, effectiveFrom: new Date('2026-01-01T00:00:00.000Z') } },
    update: { effectiveTo: null },
    create: { userId: admin.id, roleId: procManagerRole.id, effectiveFrom: new Date('2026-01-01T00:00:00.000Z') },
  });

  const buyerPassword = await bcrypt.hash('Buyer123!', 12);
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@aec.local' },
    update: { passwordHash: buyerPassword, legalEntityId: entityId, status: 'ACTIVE' },
    create: { username: 'buyer', email: 'buyer@aec.local', displayName: 'Buyer Demo', passwordHash: buyerPassword, legalEntityId: entityId },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId_effectiveFrom: { userId: buyer.id, roleId: buyerRole.id, effectiveFrom: new Date('2026-01-01T00:00:00.000Z') } },
    update: { effectiveTo: null },
    create: { userId: buyer.id, roleId: buyerRole.id, effectiveFrom: new Date('2026-01-01T00:00:00.000Z') },
  });

  // Buyer permissions
  const buyerPermissionCodes = [
    'Project.VIEW', 'WBS.VIEW', 'PurchaseRequisition.VIEW', 'PurchaseRequisition.CREATE',
    'PurchaseOrder.VIEW', 'PurchaseOrder.CREATE', 'Approval.VIEW', 'Approval.SUBMIT', 'Approval.APPROVE',
  ];
  for (const code of buyerPermissionCodes) {
    const permission = await prisma.permission.findUnique({ where: { code } });
    if (!permission) continue;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId_scopeType_scopeValue: { roleId: buyerRole.id, permissionId: permission.id, scopeType: 'GLOBAL', scopeValue: '' } },
      update: {},
      create: { roleId: buyerRole.id, permissionId: permission.id, scopeType: 'GLOBAL', scopeValue: '' },
    });
  }

  console.log(`[users] Seeded: ${admin.email}, ${buyer.email}`);
  return { superAdminRole, buyerRole, procManagerRole, admin, buyer };
}

async function seedDemoData(entityId: string) {
  const demoProject = await prisma.project.upsert({
    where: { code: 'PRJ-EPC-2027-014' },
    update: {},
    create: {
      code: 'PRJ-EPC-2027-014',
      name: 'EPC Industrial Processing Facility',
      client: 'PT Klien Utama',
      legalEntityId: entityId,
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

  const demoWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-PROJ-014' },
    update: {},
    create: { code: 'WH-PROJ-014', name: 'Warehouse Proyek 014', warehouseType: 'PROJECT', projectId: demoProject.id, location: 'Karawang' },
  });

  console.log(`[demo-data] Seeded: ${demoProject.code} + ${wbsLevels.length} WBS + ${demoWarehouse.code}`);
  return { demoProject };
}

async function seedFinance(entityId: string) {
  const coaBaseline: Array<{ code: string; name: string; accountType: string; normalBalance: string }> = [
    { code: '1100', name: 'Kas dan Bank', accountType: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1200', name: 'Piutang Usaha', accountType: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1510', name: 'PPN Masukan', accountType: 'ASSET', normalBalance: 'DEBIT' },
    { code: '1600', name: 'Persediaan', accountType: 'ASSET', normalBalance: 'DEBIT' },
    { code: '2100', name: 'Utang Usaha', accountType: 'LIABILITY', normalBalance: 'CREDIT' },
    { code: '2200', name: 'Utang Pajak', accountType: 'LIABILITY', normalBalance: 'CREDIT' },
    { code: '3100', name: 'Modal', accountType: 'EQUITY', normalBalance: 'CREDIT' },
    { code: '4100', name: 'Pendapatan', accountType: 'REVENUE', normalBalance: 'CREDIT' },
    { code: '6100', name: 'Beban Material', accountType: 'EXPENSE', normalBalance: 'DEBIT' },
    { code: '6200', name: 'Beban Operasional', accountType: 'EXPENSE', normalBalance: 'DEBIT' },
  ];
  for (const acc of coaBaseline) {
    await prisma.chartOfAccount.upsert({
      where: { legalEntityId_code: { legalEntityId: entityId, code: acc.code } },
      update: {},
      create: { legalEntityId: entityId, code: acc.code, name: acc.name, accountType: acc.accountType, normalBalance: acc.normalBalance },
    });
  }
  console.log(`[finance] Seeded ${coaBaseline.length} COA baseline (PSAK)`);
}

async function seedWorkflows() {
  type WorkflowStep = {
    stepOrder: number;
    name: string;
    approverRoleCode: string;
    conditionField?: string;
    conditionOp?: string;
    conditionValue?: number | null;
  };

  const workflowSeeds: Array<{ code: string; name: string; transactionType: string; steps: WorkflowStep[] }> = [
    {
      code: 'PR_APPROVAL',
      name: 'Purchase requisition approval',
      transactionType: 'PurchaseRequisition',
      steps: [
        { stepOrder: 1, name: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER' },
        { stepOrder: 2, name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5000000 },
      ],
    },
    {
      code: 'PO_APPROVAL',
      name: 'Purchase order approval',
      transactionType: 'PurchaseOrder',
      steps: [
        // Step 1 tanpa kondisi: SELALU berlaku. Step 2 hanya untuk nilai besar.
        // Rantai dieksekusi berurutan, dokumen baru APPROVED setelah step terakhir.
        { stepOrder: 1, name: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER' },
        { stepOrder: 2, name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'totalAmount', conditionOp: '>', conditionValue: 5000000 },
      ],
    },
  ];

  for (const wf of workflowSeeds) {
    const existing = await prisma.workflowDefinition.findFirst({ where: { code: wf.code, version: 1 } });
    const stepsData = wf.steps.map((s) => ({
      stepOrder: s.stepOrder,
      name: s.name,
      approverRoleCode: s.approverRoleCode,
      conditionField: s.conditionField ?? null,
      conditionOp: s.conditionOp ?? null,
      conditionValue: s.conditionValue ?? null,
    }));

    if (!existing) {
      const def = await prisma.workflowDefinition.create({
        data: {
          code: wf.code,
          name: wf.name,
          version: 1,
          status: 'ACTIVE',
          transactionType: wf.transactionType,
          createdBy: 'system',
          steps: { create: stepsData },
        },
      });
      console.log(`[workflows] Seeded workflow ${def.code} v${def.version}`);
    } else {
      // Rekonsiliasi: seed adalah sumber kebenaran untuk definisi v1 (dev/demo).
      // Tanpa ini, perubahan definisi di seed tidak pernah berlaku pada DB yang
      // sudah pernah di-seed, sehingga rantai berjenjang tampak "tidak jalan"
      // padahal kodenya benar. Versi lain (hasil publish di aplikasi) tidak disentuh.
      await prisma.$transaction([
        prisma.workflowStep.deleteMany({ where: { definitionId: existing.id } }),
        prisma.workflowStep.createMany({ data: stepsData.map((s) => ({ ...s, definitionId: existing.id })) }),
        // Nama ikut direkonsiliasi: seed lama menyimpan nama dari
        // `code.replace('_',' ')` yang kapital semua dan terasa seperti slug.
        prisma.workflowDefinition.update({ where: { id: existing.id }, data: { name: wf.name } }),
      ]);
      console.log(`[workflows] Reconciled steps for workflow ${existing.code} v${existing.version}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { entity } = await seedFoundation();
  const { } = await seedUsers(entity.id);
  await seedDemoData(entity.id);
  await seedFinance(entity.id);
  await seedWorkflows();
  console.log('[seed] Selesai.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
