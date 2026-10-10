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

async function seedWorkflows() {  type WorkflowStep = {
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

/**
 * Foundation Hardening (FR-FND-002/007/011): mata uang lengkap, struktur
 * organisasi effective-dated, aturan DoA (sengaja punya tumpang tindih & celah
 * agar analisis bermakna), dan riwayat kurs. Idempoten — aman dijalankan ulang.
 */
async function seedHardening(entityId: string) {
  const year = new Date().getFullYear();
  const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

  // ── A. Mata uang (IDR/USD/EUR) — dipakai FK LegalEntity & riwayat kurs ──
  const currencies = [
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 2 },
    { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
    { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  ];
  const currencyByCode = new Map<string, string>();
  for (const c of currencies) {
    const row = await prisma.currency.upsert({ where: { code: c.code }, update: { name: c.name, symbol: c.symbol, decimals: c.decimals }, create: c });
    currencyByCode.set(c.code, row.id);
  }
  console.log(`[hardening] Currency: ${currencies.map((c) => c.code).join(', ')}`);

  // ── B. Struktur organisasi (hierarki, effective-dated) ──
  // Sengaja: sebagian unit punya `effectiveTo` (berakhir) agar scrubber "as of"
  // memperlihatkan perubahan struktur pada tanggal berbeda.
  const orgSeed: Array<{ name: string; orgType: string; parent?: string; from: string; to?: string; status?: string }> = [
    { name: 'AEC Group', orgType: 'GROUP', from: `${year - 2}-01-01` },
    { name: 'Construction Division', orgType: 'BUSINESS_UNIT', parent: 'AEC Group', from: `${year - 2}-01-01` },
    { name: 'Procurement Division', orgType: 'BUSINESS_UNIT', parent: 'AEC Group', from: `${year - 2}-01-01` },
    { name: 'Finance Division', orgType: 'BUSINESS_UNIT', parent: 'AEC Group', from: `${year - 2}-01-01` },
    { name: 'Java Region', orgType: 'REGION', parent: 'Construction Division', from: `${year - 2}-01-01` },
    { name: 'Kalimantan Region', orgType: 'REGION', parent: 'Construction Division', from: `${year - 1}-01-01` },
    { name: 'Site Karawang', orgType: 'BRANCH', parent: 'Java Region', from: `${year - 1}-06-01` },
    { name: 'Legacy Marine Unit', orgType: 'DIVISION', parent: 'Construction Division', from: `${year - 2}-01-01`, to: `${year}-01-01`, status: 'INACTIVE' },
    { name: 'Structural Works', orgType: 'DEPARTMENT', parent: 'Site Karawang', from: `${year - 1}-06-01` },
    { name: 'MEP Works', orgType: 'DEPARTMENT', parent: 'Site Karawang', from: `${year}-01-01` },
  ];
  const orgByName = new Map<string, string>();
  for (const o of orgSeed) {
    const existing = await prisma.organization.findFirst({ where: { legalEntityId: entityId, name: o.name } });
    const parentId = o.parent ? (orgByName.get(o.parent) ?? (await prisma.organization.findFirst({ where: { legalEntityId: entityId, name: o.parent } }))?.id ?? null) : null;
    if (!existing) {
      const row = await prisma.organization.create({
        data: {
          legalEntityId: entityId,
          name: o.name,
          orgType: o.orgType,
          parentId,
          effectiveFrom: d(o.from),
          effectiveTo: o.to ? d(o.to) : null,
          status: o.status ?? 'ACTIVE',
        },
      });
      orgByName.set(o.name, row.id);
    } else {
      orgByName.set(o.name, existing.id);
      if (existing.parentId !== parentId) {
        await prisma.organization.update({ where: { id: existing.id }, data: { parentId } });
      }
    }
  }
  console.log(`[hardening] Organization: ${orgSeed.length} unit (effective-dated)`);

  // ── C. Aturan Delegation of Authority ──
  // Rentang sengaja tumpang tindih (PO 500jt–1.000jt ditutup dua aturan) dan
  // menyisakan celah (PO > 5.000jt, Payment > 500jt) supaya analisis bermakna.
  const doaSeed: Array<{ tx: string; from: number; to: number | null; level: string; role: string; risk?: string; status?: 'ACTIVE' | 'INACTIVE' }> = [
    { tx: 'PurchaseOrder', from: 0, to: 100_000_000, level: 'L1', role: 'BUYER' },
    { tx: 'PurchaseOrder', from: 100_000_000, to: 1_000_000_000, level: 'L2', role: 'PROCUREMENT_MANAGER' },
    { tx: 'PurchaseOrder', from: 500_000_000, to: 3_000_000_000, level: 'L3', role: 'SUPER_ADMIN' }, // overlap 500jt–1.000jt dengan L2
    { tx: 'PurchaseOrder', from: 5_000_000_000, to: null, level: 'L4', role: 'SUPER_ADMIN' }, // gap 3.000jt–5.000jt
    { tx: 'Payment', from: 0, to: 50_000_000, level: 'L1', role: 'FINANCE_MANAGER' },
    { tx: 'Payment', from: 50_000_000, to: 500_000_000, level: 'L2', role: 'FINANCE_MANAGER' },
    { tx: 'PurchaseRequisition', from: 0, to: 200_000_000, level: 'L1', role: 'PROCUREMENT_MANAGER' },
    { tx: 'PurchaseRequisition', from: 200_000_000, to: 2_000_000_000, level: 'L2', role: 'PROCUREMENT_MANAGER', risk: 'HIGH' },
    // Aturan nonaktif (menguji filter status di UI) — tidak dihitung analisis.
    { tx: 'Journal', from: 0, to: null, level: 'L5', role: 'SUPER_ADMIN', status: 'INACTIVE' },
  ];
  let doaCreated = 0;
  for (const r of doaSeed) {
    const existing = await prisma.doaRule.findFirst({
      where: { transactionType: r.tx, legalEntityId: entityId, approverLevel: r.level, amountFrom: r.from },
    });
    if (!existing) {
      await prisma.doaRule.create({
        data: {
          transactionType: r.tx,
          legalEntityId: entityId,
          amountFrom: r.from,
          amountTo: r.to,
          riskLevel: r.risk ?? null,
          approverLevel: r.level,
          approverRoleCode: r.role,
          status: r.status ?? 'ACTIVE',
        },
      });
      doaCreated += 1;
    }
  }
  console.log(`[hardening] DoaRule: +${doaCreated} (overlap & gap sengaja)`);

  // ── D. Riwayat kurs (sparkline + matriks) ──
  const rateSeed: Array<{ from: string; to: string; type: string; rate: number; date: string }> = [
    { from: 'USD', to: 'IDR', type: 'SPOT', rate: 15_000, date: `${year}-01-01` },
    { from: 'USD', to: 'IDR', type: 'SPOT', rate: 15_450, date: `${year}-03-01` },
    { from: 'USD', to: 'IDR', type: 'SPOT', rate: 15_800, date: `${year}-06-01` },
    { from: 'USD', to: 'IDR', type: 'SPOT', rate: 16_050, date: `${year}-09-01` },
    { from: 'EUR', to: 'IDR', type: 'SPOT', rate: 16_500, date: `${year}-01-01` },
    { from: 'EUR', to: 'IDR', type: 'SPOT', rate: 17_100, date: `${year}-06-01` },
    { from: 'IDR', to: 'USD', type: 'SPOT', rate: 0.0000625, date: `${year}-06-01` },
    { from: 'USD', to: 'IDR', type: 'PERIOD_END', rate: 16_100, date: `${year}-09-30` },
  ];
  let rateCreated = 0;
  for (const r of rateSeed) {
    const fromId = currencyByCode.get(r.from);
    const toId = currencyByCode.get(r.to);
    if (!fromId || !toId) continue;
    const existing = await prisma.exchangeRate.findFirst({ where: { fromCurrencyId: fromId, toCurrencyId: toId, rateType: r.type, effectiveDate: d(r.date) } });
    if (!existing) {
      await prisma.exchangeRate.create({ data: { fromCurrencyId: fromId, toCurrencyId: toId, rateType: r.type, rate: r.rate, effectiveDate: d(r.date) } });
      rateCreated += 1;
    }
  }
  console.log(`[hardening] ExchangeRate: +${rateCreated} (riwayat multi-titik)`);
}

/**
 * Master Data (FR-PRO-010, FR-FND-010): register vendor beragam (kategori +
 * status) dan setahun penuh periode fiskal dengan status bervariasi, supaya tab
 * Master Data bermakna (bukan kosong). Idempoten — aman dijalankan ulang.
 */
async function seedMasterData() {
  const year = new Date().getFullYear();

  // ── A. Vendor lintas kategori & status ──
  type VCat = 'MATERIAL' | 'SUBCONTRACTOR' | 'SERVICE' | 'EQUIPMENT' | 'OTHER';
  const vendors: Array<{ name: string; category: VCat; status?: 'ACTIVE' | 'INACTIVE'; taxId: string; contactPerson: string; email: string; phone: string; address: string }> = [
    { name: 'PT Baja Utama', category: 'MATERIAL', taxId: '01.234.567.8-901.000', contactPerson: 'Rudi Hartono', email: 'sales@bajautama.co.id', phone: '+62 21 5550 1001', address: 'Kawasan Industri Pulogadung, Jakarta' },
    { name: 'PT Semen Nasional', category: 'MATERIAL', taxId: '02.345.678.9-012.000', contactPerson: 'Siti Aminah', email: 'order@semen-nasional.co.id', phone: '+62 31 8840 2200', address: 'Gresik, Jawa Timur' },
    { name: 'CV Karya Konstruksi Mandiri', category: 'SUBCONTRACTOR', taxId: '03.456.789.0-123.000', contactPerson: 'Budi Santoso', email: 'budi@kkm.co.id', phone: '+62 812 3456 7788', address: 'Bekasi, Jawa Barat' },
    { name: 'PT Elektrik Sejahtera', category: 'SUBCONTRACTOR', taxId: '04.567.890.1-234.000', contactPerson: 'Andi Wijaya', email: 'andi@elektriksejahtera.co.id', phone: '+62 21 7788 9900', address: 'Tangerang, Banten' },
    { name: 'PT Mekanik Jaya', category: 'SERVICE', taxId: '05.678.901.2-345.000', contactPerson: 'Dewi Lestari', email: 'dewi@mekanikjaya.co.id', phone: '+62 21 3344 5566', address: 'Cikarang, Jawa Barat' },
    { name: 'PT Logistik Prima', category: 'SERVICE', taxId: '06.789.012.3-456.000', contactPerson: 'Hendra Gunawan', email: 'ops@logistikprima.co.id', phone: '+62 21 9988 7766', address: 'Cibitung, Jawa Barat' },
    { name: 'PT Alat Berat Nusantara', category: 'EQUIPMENT', taxId: '07.890.123.4-567.000', contactPerson: 'Rina Marlina', email: 'rental@alatberatnusantara.co.id', phone: '+62 31 6677 8899', address: 'Surabaya, Jawa Timur' },
    { name: 'PT Konsultan Teknik Utama', category: 'OTHER', taxId: '08.901.234.5-678.000', contactPerson: 'Fajar Nugroho', email: 'info@konsultanteknik.co.id', phone: '+62 22 4455 6677', address: 'Bandung, Jawa Barat' },
    // Vendor lama yang sudah dinonaktifkan (menguji filter status & aksi activate).
    { name: 'PT Supplier Lama (Nonaktif)', category: 'MATERIAL', status: 'INACTIVE', taxId: '09.012.345.6-789.000', contactPerson: '—', email: 'inactive@lama.co.id', phone: '+62 21 1111 2222', address: 'Jakarta' },
  ];
  let vCreated = 0;
  // Rekonsiliasi counter: vendor bisa dibuat di seed lain (seed-demo). Hitung dari
  // kode tertinggi yang ada agar tidak menabrak unique `vendorCode`.
  const existingVendors = await prisma.vendor.findMany({ select: { vendorCode: true } });
  const maxSeq = existingVendors.reduce((max, v) => {
    const n = Number(v.vendorCode.split('-').pop());
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  const prefix = `VND-${year}-`;
  await prisma.numberSequence.upsert({
    where: { code: 'VND' },
    update: { nextNumber: Math.max(maxSeq + 1, 1) },
    create: { code: 'VND', prefix, nextNumber: maxSeq + 1 },
  });
  let vSeq = await prisma.numberSequence.findUniqueOrThrow({ where: { code: 'VND' } });
  for (const v of vendors) {
    const existing = await prisma.vendor.findFirst({ where: { name: v.name } });
    if (existing) continue;
    const seq = `${vSeq.prefix}${String(vSeq.nextNumber).padStart(6, '0')}`;
    await prisma.vendor.create({
      data: { vendorCode: seq, name: v.name, taxId: v.taxId, category: v.category, status: v.status ?? 'ACTIVE', contactPerson: v.contactPerson, email: v.email, phone: v.phone, address: v.address },
    });
    vSeq = await prisma.numberSequence.update({ where: { code: 'VND' }, data: { nextNumber: { increment: 1 } } });
    vCreated += 1;
  }
  console.log(`[master-data] Vendor: +${vCreated} (kategori & status beragam)`);

  // ── B. Periode fiskal setahun penuh, status bervariasi ──
  // Bulan lampau → CLOSED/LOCKED, bulan berjalan → OPEN, bulan depan → SOFT_CLOSED, sisanya FUTURE.
  const nowMonth = new Date().getUTCMonth() + 1;
  const statusFor = (m: number): 'FUTURE' | 'OPEN' | 'SOFT_CLOSED' | 'CLOSED' | 'LOCKED' => {
    if (m < nowMonth - 2) return 'LOCKED';
    if (m < nowMonth) return 'CLOSED';
    if (m === nowMonth) return 'OPEN';
    if (m === nowMonth + 1) return 'SOFT_CLOSED';
    return 'FUTURE';
  };
  let pCreated = 0;
  for (let m = 1; m <= 12; m++) {
    const periodCode = `${year}-${String(m).padStart(2, '0')}`;
    const start = new Date(Date.UTC(year, m - 1, 1));
    const end = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));
    const existing = await prisma.fiscalPeriod.findUnique({ where: { periodCode } });
    if (existing) continue;
    await prisma.fiscalPeriod.create({
      data: { periodCode, periodYear: year, periodMonth: m, startDate: start, endDate: end, status: statusFor(m) },
    });
    pCreated += 1;
  }
  console.log(`[master-data] FiscalPeriod: +${pCreated} (${year}, status bervariasi)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {  const { entity } = await seedFoundation();
  const { } = await seedUsers(entity.id);
  await seedDemoData(entity.id);
  await seedFinance(entity.id);
  await seedWorkflows();
  await seedHardening(entity.id);
  await seedMasterData();
  console.log('[seed] Selesai.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
