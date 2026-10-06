// Demo seed — data kaya untuk demo (PRD §46). Jalankan: pnpm --filter @aec/api exec tsx prisma/seed-demo.ts
import { loadEnvFile } from '../src/shared/config/load-env';
import { PrismaClient } from '@prisma/client';

// Muat .env dengan presedensi development-aware SEBELUM Prisma diinisialisasi.
loadEnvFile();
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const now = new Date();
const year = now.getFullYear();

/**
 * Data demo halaman Workflow: satu definisi dengan riwayat versi nyata
 * (ARCHIVED → ACTIVE → DRAFT) dan task approval yang tersebar beberapa bulan,
 * supaya rail versi, diff, dan grafik bulanan punya isi.
 *
 * Rekonsiliasi: baris yang sudah ada tidak digandakan.
 */
async function seedWorkflowDemo() {
  const monthAgo = (n: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 15, 3, 0, 0));

  const admin = await prisma.user.findUnique({ where: { email: 'admin@aec.local' }, select: { id: true } });
  const buyer = await prisma.user.findUnique({ where: { email: 'buyer@aec.local' }, select: { id: true } });
  const requesterId = buyer?.id ?? admin?.id ?? 'system';
  const approverId = admin?.id ?? 'system';

  // Nama definisi yang bisa dibaca manusia. `code` tetap identifier, tapi judul
  // yang tampil memakai `name`. Nomor versi TIDAK disisipkan ke nama: versi punya
  // kolom dan badge sendiri.
  const PR_NAME = 'Purchase requisition approval';
  const PO_NAME = 'Purchase order approval';

  // Approver kedua: tanpa ini semua role dipegang satu orang dan halaman tidak
  // bisa membuktikan "siapa yang menyetujui". CFO memegang SUPER_ADMIN.
  const cfo = await prisma.user.findUnique({ where: { email: 'cfo@aec.local' }, select: { id: true } });
  const superAdminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' }, select: { id: true } });
  if (cfo && superAdminRole) {
    const existing = await prisma.userRole.findFirst({ where: { userId: cfo.id, roleId: superAdminRole.id } });
    if (!existing) {
      await prisma.userRole.create({ data: { userId: cfo.id, roleId: superAdminRole.id, effectiveFrom: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)) } });
      console.log('Role: CFO Demo memegang SUPER_ADMIN (approver kedua)');
    }
  }

  // ── Definisi: PR_APPROVAL dengan 3 versi ──
  const prCode = 'PR_APPROVAL';
  const existingVersions = await prisma.workflowDefinition.findMany({ where: { code: prCode } });
  const authorId = admin?.id ?? 'system';

  // v1 — ARCHIVED (versi lama yang sudah digantikan). Seed dasar membuat v1
  // dengan 2 langkah; versi pertama seharusnya SATU langkah, jadi direkonsiliasi
  // agar riwayat versi benar-benar berbeda antar versi (diff jadi bermakna).
  const v1 = existingVersions.find((d) => d.version === 1);
  if (!v1) {
    await prisma.workflowDefinition.create({
      data: {
        code: prCode, name: PR_NAME, description: 'Single step: procurement manager approves',
        version: 1, status: 'ARCHIVED', transactionType: 'PurchaseRequisition', createdBy: authorId,
        steps: { create: [{ stepOrder: 1, name: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER' }] },
      },
    });
    console.log('Workflow: PR_APPROVAL v1 ARCHIVED');
  } else {
    await prisma.$transaction([
      prisma.workflowStep.deleteMany({ where: { definitionId: v1.id } }),
      prisma.workflowStep.createMany({
        data: [{ stepOrder: 1, name: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER', definitionId: v1.id }],
      }),
      prisma.workflowDefinition.update({
        where: { id: v1.id },
        data: { name: PR_NAME, status: 'ARCHIVED', createdBy: authorId, description: 'Single step: procurement manager approves' },
      }),
    ]);
  }

  // v2 — ACTIVE (dipakai runtime).
  const v2 = existingVersions.find((d) => d.version === 2);
  if (!v2) {
    await prisma.workflowDefinition.create({
      data: {
        code: prCode, name: PR_NAME, description: 'Manager approval, then board approval above 5 million',
        version: 2, status: 'ACTIVE', transactionType: 'PurchaseRequisition', createdBy: authorId,
        steps: {
          create: [
            { stepOrder: 1, name: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER' },
            { stepOrder: 2, name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 },
          ],
        },
      },
    });
    console.log('Workflow: PR_APPROVAL v2 ACTIVE');
  } else {
    await prisma.$transaction([
      prisma.workflowStep.deleteMany({ where: { definitionId: v2.id } }),
      prisma.workflowStep.createMany({
        data: [
          { stepOrder: 1, name: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER', definitionId: v2.id },
          { stepOrder: 2, name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000, definitionId: v2.id },
        ],
      }),
      prisma.workflowDefinition.update({
        where: { id: v2.id },
        data: { name: PR_NAME, createdBy: authorId, description: 'Manager approval, then board approval above 5 million' },
      }),
    ]);
  }

  // v3 — DRAFT (sedang disiapkan; bisa diedit & dibandingkan dengan v2).
  const v3 = existingVersions.find((d) => d.version === 3);
  if (!v3) {
    await prisma.workflowDefinition.create({
      data: {
        code: prCode, name: PR_NAME, description: 'Adds a finance review before the board step',
        version: 3, status: 'DRAFT', transactionType: 'PurchaseRequisition', createdBy: authorId,
        steps: {
          create: [
            { stepOrder: 1, name: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER' },
            { stepOrder: 2, name: 'Finance review', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 10_000_000 },
            { stepOrder: 3, name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 100_000_000 },
          ],
        },
      },
    });
    console.log('Workflow: PR_APPROVAL v3 DRAFT');
  } else {
    await prisma.$transaction([
      prisma.workflowStep.deleteMany({ where: { definitionId: v3.id } }),
      prisma.workflowStep.createMany({
        data: [
          { stepOrder: 1, name: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER', definitionId: v3.id },
          { stepOrder: 2, name: 'Finance review', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 10_000_000, definitionId: v3.id },
          { stepOrder: 3, name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 100_000_000, definitionId: v3.id },
        ],
      }),
      prisma.workflowDefinition.update({
        where: { id: v3.id },
        data: { name: PR_NAME, status: 'DRAFT', createdBy: authorId, description: 'Adds a finance review before the board step' },
      }),
    ]);
  }

  // PO_APPROVAL: nama yang bisa dibaca, dan langkahnya ikut direkonsiliasi.
  const poDef = await prisma.workflowDefinition.findFirst({ where: { code: 'PO_APPROVAL', version: 1 } });
  if (poDef) {
    await prisma.$transaction([
      prisma.workflowStep.deleteMany({ where: { definitionId: poDef.id } }),
      prisma.workflowStep.createMany({
        data: [
          { stepOrder: 1, name: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER', definitionId: poDef.id },
          { stepOrder: 2, name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'totalAmount', conditionOp: '>', conditionValue: 5_000_000, definitionId: poDef.id },
        ],
      }),
      prisma.workflowDefinition.update({ where: { id: poDef.id }, data: { name: PO_NAME, status: 'ACTIVE', createdBy: authorId } }),
    ]);
  }

  // Rekonsiliasi: hanya SATU versi boleh ACTIVE per code (kalau tidak,
  // `getActiveDefinition` ambigu), dan versi ACTIVE harus ADA — tanpa itu submit
  // PR/PO gagal. Urutan yang diinginkan untuk demo: v1 ARCHIVED, v2 ACTIVE, v3 DRAFT.
  const allVersions = await prisma.workflowDefinition.findMany({ where: { code: prCode } });
  const wanted: Record<number, string> = { 1: 'ARCHIVED', 2: 'ACTIVE', 3: 'DRAFT' };
  for (const d of allVersions) {
    const target = wanted[d.version];
    if (target && d.status !== target) {
      await prisma.workflowDefinition.update({ where: { id: d.id }, data: { status: target } });
      console.log(`Workflow: ${prCode} v${d.version} ${d.status} → ${target}`);
    }
  }

  // Rekonsiliasi artefak lama: `createNewVersion` dulu menyisipkan nomor versi ke
  // `name` ("PO APPROVAL v2") dan nama langkah lama masih berbahasa Indonesia.
  // Keduanya dibersihkan sekali agar judul halaman layak dibaca.
  const LEGACY_STEP_NAMES: Record<string, string> = {
    'Approval Manager Pengadaan': 'Procurement manager approval',
    'Approval Direksi': 'Board approval',
    'Finance Review': 'Finance review',
  };
  const allDefs = await prisma.workflowDefinition.findMany({ select: { id: true, code: true, version: true, name: true } });
  let renamed = 0;
  for (const d of allDefs) {
    const stripped = d.name.replace(/\s+v\d+$/, '');
    const target = d.code === 'PO_APPROVAL' ? PO_NAME : stripped;
    if (target !== d.name) {
      await prisma.workflowDefinition.update({ where: { id: d.id }, data: { name: target } });
      renamed += 1;
    }
  }
  if (renamed > 0) console.log(`Workflow: ${renamed} nama dibersihkan dari nomor versi`);

  for (const [from, to] of Object.entries(LEGACY_STEP_NAMES)) {
    const res = await prisma.workflowStep.updateMany({ where: { name: from }, data: { name: to } });
    if (res.count > 0) console.log(`WorkflowStep: "${from}" -> "${to}" (${res.count})`);
  }

  // Jenis transaksi lain pun: pastikan ada tepat satu ACTIVE.
  for (const txType of ['PurchaseOrder', 'PurchaseRequisition']) {
    const actives = await prisma.workflowDefinition.findMany({ where: { transactionType: txType, status: 'ACTIVE' }, orderBy: { version: 'desc' } });
    if (actives.length > 1) {
      const [winner, ...losers] = actives;
      await prisma.workflowDefinition.updateMany({ where: { id: { in: losers.map((l) => l.id) } }, data: { status: 'ARCHIVED' } });
      console.log(`Workflow: ${txType} v${winner!.version} ACTIVE, ${losers.length} lain diarsipkan`);
    } else if (actives.length === 0) {
      // Tidak ada ACTIVE sama sekali → promosikan versi tertinggi yang punya langkah.
      const candidate = await prisma.workflowDefinition.findFirst({
        where: { transactionType: txType, status: { not: 'ACTIVE' }, steps: { some: {} } },
        orderBy: [{ status: 'asc' }, { version: 'desc' }],
      });
      if (candidate) {
        await prisma.workflowDefinition.update({ where: { id: candidate.id }, data: { status: 'ACTIVE' } });
        console.log(`Workflow: ${txType} tanpa ACTIVE → v${candidate.version} dipromosikan`);
      }
    }
  }

  // ── Task approval tersebar 4 bulan, agar grafik bulanan & funnel bermakna ──
  const prs = await prisma.purchaseRequisition.findMany({ select: { id: true, prNumber: true }, orderBy: { createdAt: 'asc' } });
  if (prs.length === 0) return;

  const existingTasks = await prisma.approvalTask.count({ where: { transactionType: 'PurchaseRequisition' } });
  console.log(`ApprovalTask: ${existingTasks} sudah ada — tanggal direkonsiliasi agar tersebar`);

  // Pola status per dokumen — deterministik supaya demo dapat diulang.
  const outcomeFor = (index: number): { stepOrder: number; status: string } => {
    const cycle = index % 5;
    if (cycle === 0) return { stepOrder: 1, status: 'APPROVED' };
    if (cycle === 1) return { stepOrder: 2, status: 'APPROVED' };
    if (cycle === 2) return { stepOrder: 1, status: 'REJECTED' };
    if (cycle === 3) return { stepOrder: 1, status: 'PENDING' };
    return { stepOrder: 2, status: 'PENDING' };
  };

  let created = 0;
  let reconciled = 0;
  for (const [index, pr] of prs.entries()) {
    const outcome = outcomeFor(index);
    const createdAt = monthAgo(index % 4);
    const step1DecidedAt = outcome.status === 'PENDING' ? null : new Date(createdAt.getTime() + 3 * 86_400_000);
    const step2CreatedAt = new Date(createdAt.getTime() + 2 * 86_400_000);

    const step1 = await prisma.approvalTask.findFirst({
      where: { transactionType: 'PurchaseRequisition', transactionId: pr.id, stepOrder: 1 },
    });
    const step2 = await prisma.approvalTask.findFirst({
      where: { transactionType: 'PurchaseRequisition', transactionId: pr.id, stepOrder: 2 },
    });

    if (!step1) {
      // Langkah 1 selalu ada; dokumen yang sampai langkah 2 punya baris tambahan.
      await prisma.approvalTask.create({
        data: {
          transactionType: 'PurchaseRequisition', transactionId: pr.id, transactionCode: pr.prNumber,
          stepOrder: 1, stepName: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER',
          status: outcome.stepOrder === 1 ? outcome.status : 'APPROVED',
          requesterId, approverId: outcome.stepOrder === 1 && outcome.status !== 'PENDING' ? approverId : null,
          comment: outcome.status === 'REJECTED' ? 'Budget line not available this quarter' : null,
          decidedAt: outcome.stepOrder === 1 ? step1DecidedAt : new Date(createdAt.getTime() + 2 * 86_400_000),
          createdAt,
        },
      });
      created += 1;
    } else if (step1.createdAt.getTime() !== createdAt.getTime()) {
      // Rekonsiliasi: task lama semuanya bertanggal hari ini → grafik bulanan
      // hanya punya satu titik. Sebar ulang agar bermakna.
      await prisma.approvalTask.update({ where: { id: step1.id }, data: { createdAt, decidedAt: step1.decidedAt ? step1DecidedAt : null } });
      reconciled += 1;
    }

    if (outcome.stepOrder === 2) {
      if (!step2) {
        await prisma.approvalTask.create({
          data: {
            transactionType: 'PurchaseRequisition', transactionId: pr.id, transactionCode: pr.prNumber,
            stepOrder: 2, stepName: 'Board approval', approverRoleCode: 'SUPER_ADMIN',
            status: outcome.status,
            requesterId, approverId: outcome.status === 'PENDING' ? null : approverId,
            decidedAt: step1DecidedAt, createdAt: step2CreatedAt,
          },
        });
        created += 1;
      } else if (step2.createdAt.getTime() !== step2CreatedAt.getTime()) {
        await prisma.approvalTask.update({ where: { id: step2.id }, data: { createdAt: step2CreatedAt, decidedAt: outcome.status === 'PENDING' ? null : step1DecidedAt } });
        reconciled += 1;
      }
    }
  }
  console.log(`ApprovalTask: +${created} dibuat, ${reconciled} tanggal direkonsiliasi (tersebar 4 bulan)`);
}

async function main() {
  const entity = await prisma.legalEntity.findUnique({ where: { code: 'AEC-CON' } });
  if (!entity) throw new Error('Seed base dulu: pnpm --filter @aec/api db:seed');

  // ── 1. Vendor master ──
  const vendors = ['PT Baja Utama', 'PT Semen Nasional', 'PT Mekanik Jaya', 'PT Elektrik Sejahtera', 'PT Logistik Prima'];
  const vendorRows = [];
  for (let vi = 0; vi < vendors.length; vi++) {
    const v = vendors[vi];
    const code = `VND-${year}-${String(vi + 1).padStart(6, '0')}`;
    const vendor = await prisma.vendor.upsert({
      where: { vendorCode: code },
      update: { name: v },
      create: { vendorCode: code, name: v, category: 'MATERIAL', status: 'ACTIVE' },
    });
    vendorRows.push(vendor);
  }
  console.log(`Vendor: ${vendorRows.length}`);

  // ── 2. Client + contract ──
  let client = await prisma.client.upsert({
    where: { clientCode: `CLT-${year}-900001` },
    update: { name: 'PT Klien Utama' },
    create: { clientCode: `CLT-${year}-900001`, name: 'PT Klien Utama', industry: 'OIL_GAS', contactPerson: 'Rina', email: 'rina@klien.co.id' },
  });
  let contract = await prisma.contract.upsert({
    where: { contractNumber: `CTR-${year}-900001` },
    update: { title: 'EPC Industrial Processing Facility' },
    create: {
      contractNumber: `CTR-${year}-900001`, clientId: client.id, title: 'EPC Industrial Processing Facility',
      contractType: 'LUMP_SUM', value: 4800000000000, advanceTerm: 10, retentionTerm: 5, status: 'EXECUTED',
      signedDate: new Date(`${year}-01-15`), startDate: new Date(`${year}-02-01`), endDate: new Date(`${year + 3}-01-31`),
    },
  });
  console.log(`Client: ${client.name} | Contract: ${contract.contractNumber} (${contract.value.toLocaleString('id-ID')})`);

  // ── 3. Project PRJ-EPC-2027-014 + WBS + Budget ──
  let project = await prisma.project.findUnique({ where: { code: 'PRJ-EPC-2027-014' } });
  if (!project) {
    project = await prisma.project.create({
      data: { code: 'PRJ-EPC-2027-014', name: 'EPC Industrial Processing Facility', client: 'PT Klien Utama', legalEntityId: entity.id, location: 'Karawang', currency: 'IDR', contractValue: 4800000000000, advanceAmount: 480000000000, advanceRecoveryRate: 10, status: 'ACTIVE', director: 'Ir. Budi Santoso', manager: 'Ahmad Fauzi' },
    });
  } else if (project.contractValue == null) {
    // Rekonsiliasi: proyek demo bisa sudah dibuat oleh seed dasar tanpa nilai kontrak.
    // Isi hanya bila kosong — jangan menimpa data yang sudah diubah manual.
    project = await prisma.project.update({ where: { id: project.id }, data: { contractValue: 4800000000000 } });
    console.log(`Project ${project.code}: contract value diisi 4.8T`);
  }

  const wbsSeed = [
    { code: '1', name: 'Engineering', amount: 480000000000, costType: 'LABOR' },
    { code: '2', name: 'Procurement', amount: 1920000000000, costType: 'MATERIAL' },
    { code: '3', name: 'Construction', amount: 1920000000000, costType: 'SUBCONTRACTOR' },
    { code: '4', name: 'Commissioning', amount: 480000000000, costType: 'EQUIPMENT' },
  ];
  const wbsMap = new Map<string, string>();
  for (const w of wbsSeed) {
    const wbs = await prisma.wbsItem.upsert({
      where: { projectId_code: { projectId: project.id, code: w.code } },
      update: {},
      create: { projectId: project.id, code: w.code, name: w.name, sortOrder: Number(w.code) },
    });
    wbsMap.set(w.code, wbs.id);
    // Rekonsiliasi: satu budget item PUBLISHED per WBS dengan cost type yang BERBEDA
    // agar rincian per cost type bermakna di demo. Baris DIRECT lama dihapus.
    await prisma.budgetItem.deleteMany({ where: { projectId: project.id, wbsItemId: wbs.id, costType: 'DIRECT' } });
    const existing = await prisma.budgetItem.findUnique({ where: { projectId_wbsItemId_costType: { projectId: project.id, wbsItemId: wbs.id, costType: w.costType } } });
    if (!existing) {
      await prisma.budgetItem.create({ data: { projectId: project.id, wbsItemId: wbs.id, costType: w.costType, amount: w.amount, status: 'PUBLISHED', version: 1 } });
    }
  }
  console.log(`Project: ${project.code} + WBS ${wbsMap.size} + budget 4.8T PUBLISHED (4 cost types)`);

  // ── 3b. PR APPROVED, tertaut ke PO demo (agar "related documents" terisi) ──
  // `requestedBy` harus ID user, bukan email. Sebelumnya seed menulis
  // 'buyer@aec.local' sehingga resolusi nama selalu gagal.
  const buyerUser = await prisma.user.findUnique({ where: { email: 'buyer@aec.local' }, select: { id: true } });
  const demoPr = await prisma.purchaseRequisition.findFirst({ where: { projectId: project.id, description: 'Structural Steel Procurement' } });
  let prId = demoPr?.id;
  if (!demoPr) {
    const seq = await prisma.numberSequence.upsert({ where: { code: 'PR' }, update: { nextNumber: { increment: 1 } }, create: { code: 'PR', prefix: `PR-${year}-EPC-`, nextNumber: 2 } });
    const created = await prisma.purchaseRequisition.create({
      data: {
        prNumber: `${seq.prefix}${String(seq.nextNumber - 1).padStart(6, '0')}`,
        projectId: project.id, wbsItemId: wbsMap.get('2'), requestedBy: buyerUser?.id ?? 'system',
        description: 'Structural Steel Procurement', status: 'APPROVED', estimatedTotal: 150000000000,
        items: { create: [{ description: 'Structural Steel', quantity: 5000, unit: 'ton', estimatedUnitPrice: 30000000, estimatedTotal: 150000000000 }] },
      },
    });
    prId = created.id;
    console.log(`PR approved: ${created.prNumber} → linked to PO`);
  } else if (buyerUser && demoPr.requestedBy !== buyerUser.id) {
    await prisma.purchaseRequisition.update({ where: { id: demoPr.id }, data: { requestedBy: buyerUser.id } });
    console.log(`PR ${demoPr.prNumber}: requestedBy diperbaiki ke ID user buyer`);
  }

  // ── 4. PO released (commitment) — tertaut ke PR demo ──
  const demoPo = await prisma.purchaseOrder.findUnique({ where: { poNumber: `PO-${year}-EPC-900001` } });
  if (!demoPo) {
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${year}-EPC-900001`, projectId: project.id, requisitionId: prId ?? null, vendor: 'PT Baja Utama', totalAmount: 150000000000,
        status: 'RELEASED', issuedAt: now, releasedBy: 'system',
        items: { create: [{ description: 'Structural Steel', quantity: 5000, unit: 'ton', unitPrice: 30000000, totalPrice: 150000000000, wbsItemId: wbsMap.get('2') }] },
      },
    });
    console.log(`PO released: ${po.poNumber} (${po.totalAmount.toLocaleString('id-ID')}) linked to PR ${prId ? 'yes' : 'no'}`);
  } else {
    // Rekonsiliasi: tautkan PO demo ke PR demo agar "related documents" terisi,
    // tanpa menyentuh PO lain yang mungkin sudah punya relasi sendiri.
    if (!demoPo.requisitionId && prId) {
      await prisma.purchaseOrder.update({ where: { id: demoPo.id }, data: { requisitionId: prId } });
      console.log(`PO released: ${demoPo.poNumber} → linked to PR`);
    } else {
      console.log(`PO released: ${demoPo.poNumber} sudah ada`);
    }
  }

  // ── 4b. Vendor performance ratings (agar kartu vendor punya isi) ──
  const ratedVendor = await prisma.vendor.findUnique({ where: { vendorCode: `VND-${year}-000001` } });
  if (ratedVendor) {
    const ratingCount = await prisma.vendorPerformanceRating.count({ where: { vendorId: ratedVendor.id } });
    if (ratingCount === 0) {
      await prisma.vendorPerformanceRating.createMany({
        data: [
          { vendorId: ratedVendor.id, projectId: project.id, category: 'DELIVERY', score: 4, remark: 'Tepat waktu', ratedBy: 'system' },
          { vendorId: ratedVendor.id, projectId: project.id, category: 'QUALITY', score: 5, remark: 'Material sesuai spek', ratedBy: 'system' },
          { vendorId: ratedVendor.id, projectId: project.id, category: 'COMMERCIAL', score: 3, remark: 'Harga kompetitif', ratedBy: 'system' },
        ],
      });
      console.log('VendorPerformanceRating: 3 untuk PT Baja Utama');
    }
  }

  // ── 5. Warehouse + stock (GR) ──
  let warehouse = await prisma.warehouse.findUnique({ where: { code: 'WH-PROJ-014' } });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({ data: { code: 'WH-PROJ-014', name: 'Warehouse Proyek 014', warehouseType: 'PROJECT', projectId: project.id, location: 'Karawang' } });
  }

  const demoGr = await prisma.goodsReceipt.findUnique({ where: { grNumber: `GR-${year}-EPC-900001` } });
  if (!demoGr) {
    const po = demoPo ?? await prisma.purchaseOrder.findFirst({ where: { projectId: project.id, status: 'RELEASED' } });
    if (po) {
      const poItem = await prisma.purchaseOrderItem.findFirst({ where: { purchaseOrderId: po.id } });
      const gr = await prisma.goodsReceipt.create({
        data: {
          grNumber: `GR-${year}-EPC-900001`, poId: po.id, projectId: project.id, warehouseId: warehouse.id, receivedBy: 'system', status: 'POSTED',
          items: { create: [{ poItemId: poItem?.id ?? '', description: 'Structural Steel', quantity: 5000, unit: 'ton', wbsItemId: wbsMap.get('2') }] },
        },
        include: { items: true },
      });
      // stock ledger entry
      if (poItem) {
        await prisma.stockLedgerEntry.create({
          data: { projectId: project.id, wbsItemId: wbsMap.get('2'), warehouseId: warehouse.id, movementType: 'IN', quantity: 5000, unit: 'ton', unitPrice: 30000000, totalValue: 150000000000, documentType: 'GR', documentId: gr.items[0]?.id ?? null, reference: gr.grNumber, description: 'GR Structural Steel', balanceAfter: 5000 },
        });
      }
      console.log(`GR: ${gr.grNumber} + ledger 5000 ton`);
    }
  }

  // ── 6. Construction work package + progress ──
  const demoWp = await prisma.constructionWorkPackage.findUnique({ where: { wpNumber: `WP-${year}-EPC-900001` } });
  if (!demoWp) {
    const wp = await prisma.constructionWorkPackage.create({
      data: { wpNumber: `WP-${year}-EPC-900001`, projectId: project.id, wbsItemId: wbsMap.get('3') ?? wbsMap.get('2')!, title: 'Erection Steel Structure', plannedQty: 5000, unit: 'ton', status: 'IN_PROGRESS', requiresIFC: false, readyStatus: 'READY', startDate: new Date(`${year}-03-01`) },
    });
    await prisma.workPackageProgress.create({ data: { workPackageId: wp.id, physicalProgress: 45, achievedQty: 2250, measuredBy: 'Surveyor' } });
    console.log(`WorkPackage: ${wp.wpNumber} progress 45%`);
  } else {
    console.log(`WorkPackage: ${demoWp.wpNumber} sudah ada`);
  }

  // ── 7. Vendor invoice POSTED (AP + GL) ──
  const demoInv = await prisma.vendorInvoice.findUnique({ where: { invoiceNumber: `INV-${year}-EPC-900001` } });
  if (!demoInv) {
    const po = demoPo ?? await prisma.purchaseOrder.findFirst({ where: { projectId: project.id } });
    const inv = await prisma.vendorInvoice.create({
      data: {
        invoiceNumber: `INV-${year}-EPC-900001`, poId: po?.id ?? '', projectId: project.id, vendor: 'PT Baja Utama', vendorInvoiceNo: 'INV-BAJA-001', amount: 75000000000, taxAmount: 7500000000, totalAmount: 82500000000, status: 'POSTED',
      },
    });
    // Auto-GL: Dr Beban 6100 + PPN 1510 | Cr AP 2100
    const expense = await prisma.chartOfAccount.findFirst({ where: { legalEntityId: entity.id, code: '6100' } });
    const ap = await prisma.chartOfAccount.findFirst({ where: { legalEntityId: entity.id, code: '2100' } });
    const vat = await prisma.chartOfAccount.findFirst({ where: { legalEntityId: entity.id, code: '1510' } });
    if (expense && ap && vat) {
      const seq = await prisma.numberSequence.upsert({ where: { code: 'JRN' }, update: { nextNumber: { increment: 1 } }, create: { code: 'JRN', prefix: `JRN-${year}-EPC-`, nextNumber: 2 } });
      await prisma.journal.create({
        data: {
          journalNumber: `${seq.prefix}${String(seq.nextNumber - 1).padStart(6, '0')}`, legalEntityId: entity.id, date: now, source: 'INVOICE', sourceId: inv.id,
          reference: inv.invoiceNumber, description: `Invoice ${inv.invoiceNumber}`, status: 'POSTED', postedAt: now, postedBy: 'system',
          lines: { create: [
            { accountId: expense.id, description: 'Pembelian material', debit: 75000000000, credit: 0, projectId: project.id },
            { accountId: vat.id, description: 'PPN Masukan', debit: 7500000000, credit: 0 },
            { accountId: ap.id, description: 'Utang vendor', debit: 0, credit: 82500000000 },
          ] },
        },
      });
    }
    console.log(`VendorInvoice: ${inv.invoiceNumber} POSTED + GL 82.5M`);
  }

  // ── 7b. Aging spread: beberapa vendor invoice dengan tanggal berbeda ──
  // Aging report hanya bermakna bila bucket 1-30/31-60/61-90/90+ benar-benar terisi.
  const poForAging = demoPo ?? await prisma.purchaseOrder.findFirst({ where: { projectId: project.id } });
  const apSeed: Array<{ n: string; vendor: string; amount: number; daysAgo: number }> = [
    { n: `INV-${year}-EPC-900101`, vendor: 'PT Semen Nasional', amount: 12_000_000_000, daysAgo: 20 },
    { n: `INV-${year}-EPC-900102`, vendor: 'PT Mekanik Jaya', amount: 25_000_000_000, daysAgo: 50 },
    { n: `INV-${year}-EPC-900103`, vendor: 'PT Elektrik Sejahtera', amount: 18_000_000_000, daysAgo: 75 },
    { n: `INV-${year}-EPC-900104`, vendor: 'PT Logistik Prima', amount: 9_000_000_000, daysAgo: 120 },
  ];
  for (const a of apSeed) {
    const exists = await prisma.vendorInvoice.findUnique({ where: { invoiceNumber: a.n } });
    if (!exists && poForAging) {
      const d = new Date(now.getTime() - a.daysAgo * 86400000);
      await prisma.vendorInvoice.create({
        data: {
          invoiceNumber: a.n, poId: poForAging.id, projectId: project.id, vendor: a.vendor, vendorInvoiceNo: `${a.vendor}-${a.daysAgo}`,
          amount: a.amount, taxAmount: Math.round(a.amount * 0.1), totalAmount: Math.round(a.amount * 1.1), status: 'POSTED', invoiceDate: d, postedAt: d, postedBy: 'system',
        },
      });
    }
  }
  // Sebagian AP dibayar (agar `outstanding` < total — bukan hanya angka kotor).
  const paidAp = await prisma.vendorInvoice.findUnique({ where: { invoiceNumber: `INV-${year}-EPC-900102` } });
  if (paidAp && (await prisma.payment.count({ where: { vendor: 'PT Mekanik Jaya' } })) === 0) {
    const payDate = new Date(now.getTime() - 10 * 86400000);
    const seq = await prisma.numberSequence.upsert({ where: { code: 'PAY' }, update: { nextNumber: { increment: 1 } }, create: { code: 'PAY', prefix: `PAY-${year}-EPC-`, nextNumber: 2 } });
    await prisma.payment.create({
      data: {
        paymentNumber: `${seq.prefix}${String(seq.nextNumber - 1).padStart(6, '0')}`, projectId: project.id, vendor: 'PT Mekanik Jaya',
        totalAmount: 10_000_000_000, status: 'PAID', paymentDate: payDate, paidBy: 'system',
        items: { create: [{ invoiceId: paidAp.id, amount: 10_000_000_000 }] },
      },
    });
  }
  console.log(`AP aging: ${apSeed.length} vendor invoice (bucket 1-30…90+)`);

  // ── 8. Client claim certified → invoice → collection (AR) ──
  const demoClaim = await prisma.progressClaim.findUnique({ where: { claimNumber: `CLM-${year}-EPC-900001` } });
  if (!demoClaim) {
    const wp = await prisma.constructionWorkPackage.findFirst({ where: { projectId: project.id } });
    const claim = await prisma.progressClaim.create({
      data: { claimNumber: `CLM-${year}-EPC-900001`, projectId: project.id, period: `${year}-08`, amount: 200000000000, claimType: 'PROGRESS', status: 'CERTIFIED', workPackageId: wp?.id, physicalProgressAtClaim: 45, billableProgress: 40, certifiedAmount: 200000000000, retentionRate: 5, retentionAmount: 10000000000, netCertifiedAmount: 190000000000, recoveryAmount: 19000000000, cumulativeRecovered: 19000000000 },
    });
    const cinv = await prisma.clientInvoice.create({
      data: { invoiceNumber: `CINV-${year}-EPC-900001`, projectId: project.id, claimId: claim.id, client: 'PT Klien Utama', amount: 171000000000, taxAmount: 17100000000, totalAmount: 188100000000, status: 'POSTED', postedAt: now, postedBy: 'system' },
    });
    // Auto-GL: Dr Piutang | Cr Pendapatan + PPN Keluaran
    const ar = await prisma.chartOfAccount.findFirst({ where: { legalEntityId: entity.id, code: '1200' } });
    const revenue = await prisma.chartOfAccount.findFirst({ where: { legalEntityId: entity.id, code: '4100' } });
    const vatOut = await prisma.chartOfAccount.findFirst({ where: { legalEntityId: entity.id, code: '2200' } });
    if (ar && revenue && vatOut) {
      const seq = await prisma.numberSequence.upsert({ where: { code: 'JRN' }, update: { nextNumber: { increment: 1 } }, create: { code: 'JRN', prefix: `JRN-${year}-EPC-`, nextNumber: 2 } });
      await prisma.journal.create({
        data: {
          journalNumber: `${seq.prefix}${String(seq.nextNumber - 1).padStart(6, '0')}`, legalEntityId: entity.id, date: now, source: 'CLIENT_INVOICE', sourceId: cinv.id,
          reference: cinv.invoiceNumber, description: `Client Invoice ${cinv.invoiceNumber}`, status: 'POSTED', postedAt: now, postedBy: 'system',
          lines: { create: [
            { accountId: ar.id, description: 'Piutang klien', debit: 188100000000, credit: 0, projectId: project.id },
            { accountId: revenue.id, description: 'Pendapatan progres', debit: 0, credit: 171000000000, projectId: project.id },
            { accountId: vatOut.id, description: 'PPN Keluaran', debit: 0, credit: 17100000000 },
          ] },
        },
      });
    }
    // Collection 100M
    const col = await prisma.collection.create({
      data: { collectionNumber: `COL-${year}-EPC-900001`, projectId: project.id, client: 'PT Klien Utama', totalAmount: 100000000000, status: 'POSTED', items: { create: [{ clientInvoiceId: cinv.id, amount: 100000000000 }] } },
    });
    const cash = await prisma.chartOfAccount.findFirst({ where: { legalEntityId: entity.id, code: '1100' } });
    if (ar && cash) {
      const seq = await prisma.numberSequence.upsert({ where: { code: 'JRN' }, update: { nextNumber: { increment: 1 } }, create: { code: 'JRN', prefix: `JRN-${year}-EPC-`, nextNumber: 2 } });
      await prisma.journal.create({
        data: {
          journalNumber: `${seq.prefix}${String(seq.nextNumber - 1).padStart(6, '0')}`, legalEntityId: entity.id, date: now, source: 'COLLECTION', sourceId: col.id,
          reference: col.collectionNumber, description: `Collection ${col.collectionNumber}`, status: 'POSTED', postedAt: now, postedBy: 'system',
          lines: { create: [
            { accountId: cash.id, description: 'Kas masuk', debit: 100000000000, credit: 0, projectId: project.id },
            { accountId: ar.id, description: 'Pelunasan piutang', debit: 0, credit: 100000000000 },
          ] },
        },
      });
    }
    console.log(`Claim→Invoice→Collection: 100M kas masuk`);
  }

  // ── 8b. Aging spread AR: beberapa claim + client invoice dengan tanggal berbeda ──
  // Agar bucket 1-30/31-60/61-90/90+ terisi dan konsentrasi klien bermakna.
  const arSeed: Array<{ client: string; amount: number; daysAgo: number; paidPct: number }> = [
    { client: 'PT Klien Utama', amount: 40_000_000_000, daysAgo: 25, paidPct: 0 },
    { client: 'PT Klien Utama', amount: 30_000_000_000, daysAgo: 55, paidPct: 50 },
    { client: 'PT Nusantara Energi', amount: 60_000_000_000, daysAgo: 70, paidPct: 0 },
    { client: 'PT Nusantara Energi', amount: 20_000_000_000, daysAgo: 100, paidPct: 0 },
  ];
  const wpForAr = await prisma.constructionWorkPackage.findFirst({ where: { projectId: project.id } });
  for (let i = 0; i < arSeed.length; i++) {
    const a = arSeed[i]!;
    const claimNumber = `CLM-${year}-EPC-9001${String(i + 10).padStart(2, '0')}`;
    const invoiceNumber = `CINV-${year}-EPC-9001${String(i + 10).padStart(2, '0')}`;
    const exists = await prisma.clientInvoice.findUnique({ where: { invoiceNumber } });
    if (exists) continue;
    const d = new Date(now.getTime() - a.daysAgo * 86400000);
    const claim = await prisma.progressClaim.create({
      data: {
        claimNumber, projectId: project.id, period: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
        amount: a.amount, claimType: 'PROGRESS', status: 'CERTIFIED', workPackageId: wpForAr?.id,
        physicalProgressAtClaim: 40, billableProgress: 35, certifiedAmount: a.amount,
        retentionRate: 5, retentionAmount: Math.round(a.amount * 0.05), netCertifiedAmount: Math.round(a.amount * 0.95),
        recoveryAmount: 0, cumulativeRecovered: 0,
      },
    });
    const cinv = await prisma.clientInvoice.create({
      data: {
        invoiceNumber, projectId: project.id, claimId: claim.id, client: a.client,
        amount: a.amount, taxAmount: Math.round(a.amount * 0.1), totalAmount: Math.round(a.amount * 1.1),
        status: 'POSTED', invoiceDate: d, postedAt: d, postedBy: 'system',
      },
    });
    if (a.paidPct > 0) {
      const paid = Math.round(cinv.totalAmount.toNumber() * (a.paidPct / 100));
      const colDate = new Date(d.getTime() + 20 * 86400000);
      const seq = await prisma.numberSequence.upsert({ where: { code: 'COL' }, update: { nextNumber: { increment: 1 } }, create: { code: 'COL', prefix: `COL-${year}-EPC-`, nextNumber: 2 } });
      await prisma.collection.create({
        data: {
          collectionNumber: `${seq.prefix}${String(seq.nextNumber - 1).padStart(6, '0')}`, projectId: project.id, client: a.client,
          totalAmount: paid, status: 'POSTED', collectedAt: colDate,
          items: { create: [{ clientInvoiceId: cinv.id, amount: paid }] },
        },
      });
    }
  }
  console.log(`AR aging: ${arSeed.length} client invoice (bucket 1-30…90+) + koleksi parsial`);

  // ── 8c. Cash movement multi-bulan (agar tren cash flow punya beberapa titik) ──
  const cashMovSeed: Array<{ daysAgo: number; kind: 'IN' | 'OUT'; amount: number }> = [
    { daysAgo: 95, kind: 'IN', amount: 45_000_000_000 },
    { daysAgo: 65, kind: 'OUT', amount: 30_000_000_000 },
    { daysAgo: 35, kind: 'IN', amount: 60_000_000_000 },
    { daysAgo: 12, kind: 'OUT', amount: 22_000_000_000 },
  ];
  for (const m of cashMovSeed) {
    const d = new Date(now.getTime() - m.daysAgo * 86400000);
    if (m.kind === 'IN') {
      const n = `COL-${year}-EPC-91${String(m.daysAgo).padStart(4, '0')}`;
      if (!(await prisma.collection.findUnique({ where: { collectionNumber: n } }))) {
        await prisma.collection.create({ data: { collectionNumber: n, projectId: project.id, client: 'PT Klien Utama', totalAmount: m.amount, status: 'POSTED', collectedAt: d } });
      }
    } else {
      const n = `PAY-${year}-EPC-91${String(m.daysAgo).padStart(4, '0')}`;
      if (!(await prisma.payment.findUnique({ where: { paymentNumber: n } }))) {
        await prisma.payment.create({ data: { paymentNumber: n, projectId: project.id, vendor: 'PT Baja Utama', totalAmount: m.amount, status: 'PAID', paymentDate: d, paidBy: 'system' } });
      }
    }
  }
  console.log(`Cash movement: ${cashMovSeed.length} transaksi multi-bulan`);

  // ── 9. Treasury: bank account + cash forecast ──
  const bankCount = await prisma.bankAccount.count();
  if (bankCount === 0) {
    await prisma.bankAccount.create({
      data: { accountCode: `BANK-${year}-000001`, legalEntityId: entity.id, bankCode: 'BCA', bankName: 'Bank Central Asia', accountNumber: '8880-7777-1111', accountName: 'PT AEC Construction', currency: 'IDR', openingBalance: 500000000000 },
    });
    console.log('BankAccount: BCA 500M');
  }
  // Periode diturunkan dari `now` (bukan hardcoded) agar tidak bertabrakan
  // dengan bulan sebelumnya — forecast vs actual butuh periode yang berbeda.
  const curPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevPeriod = `${prevMonth.getUTCFullYear()}-${String(prevMonth.getUTCMonth() + 1).padStart(2, '0')}`;
  const forecastSeed = [
    { forecastCode: `CF-${year}-000001`, period: curPeriod, expectedReceipt: 200_000_000_000, expectedAp: 100_000_000_000, expectedPayroll: 25_000_000_000, netForecast: 75_000_000_000 },
    { forecastCode: `CF-${year}-000002`, period: prevPeriod, expectedReceipt: 180_000_000_000, expectedAp: 120_000_000_000, expectedPayroll: 25_000_000_000, netForecast: 35_000_000_000 },
  ];
  for (const f of forecastSeed) {
    const exists = await prisma.cashForecast.findUnique({ where: { forecastCode: f.forecastCode } });
    if (!exists) {
      await prisma.cashForecast.create({ data: { ...f, legalEntityId: entity.id } });
      console.log(`CashForecast: ${f.period} net ${f.netForecast / 1e9}B`);
    } else if (exists.period !== f.period) {
      // Rekonsiliasi: periode diturunkan dari tanggal, jadi seed lama bisa
      // menyimpan periode yang sudah basi. Perbarui agar tidak bertabrakan.
      await prisma.cashForecast.update({ where: { forecastCode: f.forecastCode }, data: { ...f, legalEntityId: entity.id } });
      console.log(`CashForecast: ${f.forecastCode} periode ${exists.period} → ${f.period}`);
    }
  }

  // ── 10. Employees + equipment (HCM) ──
  const empCount = await prisma.employee.count();
  if (empCount === 0) {
    await prisma.employee.create({ data: { employeeNumber: `EMP-${year}-000001`, name: 'Budi Santoso', legalEntityId: entity.id, position: 'Project Director', grade: 'L4', status: 'ACTIVE' } });
    await prisma.employee.create({ data: { employeeNumber: `EMP-${year}-000002`, name: 'Siti Rahayu', legalEntityId: entity.id, position: 'Project Controls', grade: 'L2', status: 'ACTIVE' } });
    console.log('Employees: 2');
  }
  const eqCount = await prisma.equipment.count();
  if (eqCount === 0) {
    await prisma.equipment.create({ data: { equipmentNumber: `EQ-${year}-000001`, name: 'Mobile Crane 100t', category: 'HEAVY', serialNumber: 'CRN-001', status: 'AVAILABLE' } });
    console.log('Equipment: 1 crane');
  }

  // ── 11. Risk + NCR (governance/quality) ──
  const riskCount = await prisma.risk.count();
  if (riskCount === 0) {
    await prisma.risk.create({ data: { riskNumber: `RSK-${year}-000001`, title: 'Keterlambatan material import', category: 'SCHEDULE', likelihood: 4, impact: 5, score: 20, owner: 'Procurement Manager', mitigation: 'Lead time 3 bulan, vendor alternatif', residualLikelihood: 2, residualImpact: 4, residualScore: 8, status: 'OPEN', projectId: project.id } });
    console.log('Risk: 1');
  }

  // ── 12. Demo user roles ──
  const demoUsers = [
    { email: 'ceo@aec.local', name: 'CEO Demo', role: 'SUPER_ADMIN' },
    { email: 'cfo@aec.local', name: 'CFO Demo', role: 'SUPER_ADMIN' },
    { email: 'pm@aec.local', name: 'Project Manager Demo', role: 'SUPER_ADMIN' },
  ];
  for (const u of demoUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const hash = await bcrypt.hash('Demo123!', 12);
      await prisma.user.create({
        data: { username: u.email.split('@')[0], email: u.email, displayName: u.name, passwordHash: hash, legalEntityId: entity.id, status: 'ACTIVE' },
      });
    }
  }
  console.log('Demo users: ceo/cfo/pm @aec.local / Demo123!');

  // ── 13. Workflow demo: versi (DRAFT/ACTIVE/ARCHIVED) + task tersebar ──
  // Tanpa ini, halaman Workflow hanya punya 1 versi ACTIVE dan seluruh task
  // bertanggal hari ini — rail versi dan grafik bulanan jadi tak bermakna.
  await seedWorkflowDemo();

  console.log('\n=== DEMO SEED SELESAI ===');
  console.log('Login demo: admin@aec.local / Admin123! (super user)');
  console.log('Dashboard: /analytics, /project-controls, /treasury, /finance/closure');
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
