// Demo seed — data kaya untuk demo (PRD §46). Jalankan: pnpm --filter @aec/api exec tsx prisma/seed-demo.ts
import { loadEnvFile } from '../src/shared/config/load-env';
import { findOrphanApprovalTasks } from '../src/shared/utils/referential-integrity';
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
      const s1Status = outcome.stepOrder === 1 ? outcome.status : 'APPROVED';
      await prisma.approvalTask.create({
        data: {
          transactionType: 'PurchaseRequisition', transactionId: pr.id, transactionCode: pr.prNumber,
          stepOrder: 1, stepName: 'Procurement manager approval', approverRoleCode: 'PROCUREMENT_MANAGER',
          status: s1Status,
          requesterId, approverId: outcome.stepOrder === 1 && outcome.status !== 'PENDING' ? approverId : null,
          comment: outcome.status === 'REJECTED' ? 'Budget line not available this quarter' : null,
          decidedAt: outcome.stepOrder === 1 ? step1DecidedAt : new Date(createdAt.getTime() + 2 * 86_400_000),
          // FR-DASH-002: SLA 7 hari untuk yang masih menunggu.
          dueAt: s1Status === 'PENDING' ? new Date(createdAt.getTime() + 7 * 86_400_000) : null,
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
            decidedAt: step1DecidedAt,
            dueAt: outcome.status === 'PENDING' ? new Date(step2CreatedAt.getTime() + 7 * 86_400_000) : null,
            createdAt: step2CreatedAt,
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

  // FR-DASH-002: jamin ada beberapa approval PENDING ber-SLA agar Exception
  // Queue dashboard punya isi (sebagian sengaja sudah lewat tenggat).
  //
  // PENTING: `ApprovalTask.transactionId` harus menunjuk `id` ASLI dokumen
  // sumber. Sebelumnya seed mengarang id (mis. "PurchaseRequisition-PR-..."),
  // sehingga klik Approve → `purchaseRequisition.update` gagal P2025 (404).
  // Sekarang kita buat dokumen nyata lalu pakai `.id`-nya, dan ada guard yang
  // melewati task bila dokumen tidak ditemukan (jangan tinggalkan task yatim).
  const pendingDocSeed: {
    code: string; type: 'PurchaseRequisition' | 'PurchaseOrder'; role: string;
    ageDays: number; slaDays: number; amount: number;
  }[] = [
    { code: `PR-${year}-EPC-900002`, type: 'PurchaseRequisition', role: 'PROCUREMENT_MANAGER', ageDays: 12, slaDays: 7, amount: 42_000_000_000 },
    { code: `PR-${year}-EPC-900003`, type: 'PurchaseRequisition', role: 'PROCUREMENT_MANAGER', ageDays: 3, slaDays: 7, amount: 18_000_000_000 },
    { code: `PO-${year}-EPC-900002`, type: 'PurchaseOrder', role: 'FINANCE_MANAGER', ageDays: 9, slaDays: 5, amount: 27_000_000_000 },
  ];

  let pendingCreated = 0;
  let pendingSkipped = 0;
  // `seedWorkflowDemo` tidak menerima project; ambil proyek pertama sebagai induk
  // dokumen demo (wbsItemId null — opsional di skema).
  const demoProject = await prisma.project.findFirst({ select: { id: true } });
  for (const p of pendingDocSeed) {
    if (!demoProject) {
      pendingSkipped += 1;
      continue;
    }
    const createdTs = new Date(now.getTime() - p.ageDays * 86_400_000);

    // 1) Pastikan dokumen sumber ada; buat bila belum. Status diset menunggu
    //    keputusan (PR SUBMITTED, PO DRAFT) agar alur approve benar-benar jalan.
    let transactionId: string | null = null;
    if (p.type === 'PurchaseRequisition') {
      let doc = await prisma.purchaseRequisition.findUnique({ where: { prNumber: p.code } });
      if (!doc) {
        doc = await prisma.purchaseRequisition.create({
          data: {
            prNumber: p.code, projectId: demoProject.id, wbsItemId: null,
            requestedBy: requesterId, description: 'Awaiting approval (demo SLA)', status: 'SUBMITTED',
            estimatedTotal: p.amount,
            items: { create: [{ description: 'Demo line item', quantity: 1, unit: 'lot', estimatedUnitPrice: p.amount, estimatedTotal: p.amount }] },
            createdAt: createdTs,
          },
        });
      }
      transactionId = doc.id;
    } else {
      let doc = await prisma.purchaseOrder.findUnique({ where: { poNumber: p.code } });
      if (!doc) {
        doc = await prisma.purchaseOrder.create({
          data: {
            poNumber: p.code, projectId: demoProject.id, vendor: 'PT Mekanik Jaya', totalAmount: p.amount,
            status: 'DRAFT', createdAt: createdTs,
            items: { create: [{ description: 'Demo PO item', quantity: 1, unit: 'lot', unitPrice: p.amount, totalPrice: p.amount }] },
          },
        });
      }
      transactionId = doc.id;
    }

    // 2) Guard: jangan buat task tanpa dokumen nyata (mencegah task yatim/404).
    if (!transactionId) {
      pendingSkipped += 1;
      console.warn(`ApprovalTask: lewati ${p.code} — dokumen sumber tidak ditemukan`);
      continue;
    }

    const exists = await prisma.approvalTask.findFirst({
      where: { transactionType: p.type, transactionId, stepOrder: 1 },
    });
    if (exists) {
      // Rekonsiliasi: perbaiki task lama yang mungkin masih menunjuk id karangan.
      if (exists.dueAt == null) {
        await prisma.approvalTask.update({
          where: { id: exists.id },
          data: { dueAt: new Date(createdTs.getTime() + p.slaDays * 86_400_000) },
        });
      }
      continue;
    }

    await prisma.approvalTask.create({
      data: {
        transactionType: p.type, transactionId, transactionCode: p.code,
        stepOrder: 1, stepName: `${p.role} approval`, approverRoleCode: p.role,
        status: 'PENDING', requesterId,
        dueAt: new Date(createdTs.getTime() + p.slaDays * 86_400_000),
        createdAt: createdTs,
      },
    });
    pendingCreated += 1;
  }
  if (pendingCreated > 0) console.log(`ApprovalTask: +${pendingCreated} PENDING ber-SLA (exception queue)`);
  if (pendingSkipped > 0) console.log(`ApprovalTask: ${pendingSkipped} dilewati (dokumen sumber hilang)`);

  // 3) Bersihkan task PENDING yatim dari seed lama (transactionId bukan id asli).
  //    Task seperti ini selalu 404 saat di-approve, jadi lebih baik dihapus.
  //    Deteksi memakai helper bersama agar aturannya dapat diuji tanpa DB.
  const pendingTasks = await prisma.approvalTask.findMany({
    where: { status: 'PENDING', transactionType: { in: ['PurchaseRequisition', 'PurchaseOrder'] } },
    select: { id: true, transactionType: true, transactionId: true, transactionCode: true },
  });
  const prIds = new Set((await prisma.purchaseRequisition.findMany({ select: { id: true } })).map((r) => r.id));
  const poIds = new Set((await prisma.purchaseOrder.findMany({ select: { id: true } })).map((r) => r.id));
  const orphans = findOrphanApprovalTasks(pendingTasks, (type, id) =>
    type === 'PurchaseRequisition' ? prIds.has(id) : poIds.has(id),
  );
  for (const t of orphans) {
    await prisma.approvalTask.delete({ where: { id: t.id } });
  }
  if (orphans.length > 0) console.log(`ApprovalTask: ${orphans.length} task yatim dihapus (transactionId tidak valid)`);
}

/**
 * Portfolio demo multi-entitas (FR-DASH-003): 12 proyek di 3 legal entity,
 * dengan baseline EVM (ControlAccount.plannedValue + WorkPackageProgress),
 * opportunity funnel, dan inventory (gudang + stock ledger).
 *
 * Idempoten: seluruh baris di-upsert berdasarkan kode unik, jadi menjalankan
 * seed dua kali tidak menggandakan data.
 *
 * Sengaja dibuat bervariasi: sebagian proyek di bawah anggaran (CPI>1), sebagian
 * overrun (CPI<1), dan dua proyek tanpa baseline (NO_BUDGET → hasEvm=false),
 * supaya scatter/health/ledger punya sinyal nyata, bukan satu titik.
 */
async function seedPortfolio() {
  // ── A. Legal entity tambahan ──
  const entities = [
    { code: 'AEC-MAR', legalName: 'AEC Marine Works', taxIdentifier: '01.234.567.8-901.000', country: 'ID', functionalCurrency: 'IDR' },
    { code: 'AEC-PWR', legalName: 'AEC Power Systems', taxIdentifier: '01.234.567.8-902.000', country: 'ID', functionalCurrency: 'USD' },
  ];
  // Pastikan master Currency ada agar FK `functionalCurrencyId` terisi (bukan NULL).
  const currencyByCode = new Map<string, string>();
  for (const c of [
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 2 },
    { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
    { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  ]) {
    const row = await prisma.currency.upsert({ where: { code: c.code }, update: {}, create: c });
    currencyByCode.set(c.code, row.id);
  }
  const entityByCode = new Map<string, string>();
  const con = await prisma.legalEntity.findUnique({ where: { code: 'AEC-CON' } });
  if (con) entityByCode.set('AEC-CON', con.id);
  for (const e of entities) {
    const ccyId = currencyByCode.get(e.functionalCurrency) ?? currencyByCode.get('IDR') ?? null;
    const idrId = currencyByCode.get('IDR') ?? null;
    const row = await prisma.legalEntity.upsert({
      where: { code: e.code },
      update: { legalName: e.legalName, functionalCurrencyId: ccyId, reportingCurrencyId: idrId },
      create: { code: e.code, legalName: e.legalName, taxIdentifier: e.taxIdentifier, country: e.country, functionalCurrency: e.functionalCurrency, reportingCurrency: 'IDR', functionalCurrencyId: ccyId, reportingCurrencyId: idrId },
    });
    entityByCode.set(e.code, row.id);
  }
  if (!con) throw new Error('LegalEntity AEC-CON tidak ada — jalankan seed dasar dulu.');

  // Dipakai sebagai `requestedBy` / `releasedBy` dokumen demo. Harus ID user
  // (bukan email) agar nama penanggung jawab bisa diresolusi di UI.
  const buyerUser = await prisma.user.findUnique({ where: { email: 'buyer@aec.local' }, select: { id: true } });
  const buyerUserId = buyerUser?.id ?? null;

  // ── B. Klien tambahan ──
  const clientRows = [
    { clientCode: `CLT-${year}-900002`, name: 'PT Marine Nusantara', industry: 'MARINE' },
    { clientCode: `CLT-${year}-900003`, name: 'PT Power Indonesia', industry: 'POWER' },
    { clientCode: `CLT-${year}-900004`, name: 'PT Energi Prima', industry: 'OIL_GAS' },
  ];
  const clientIds: string[] = [];
  for (const c of clientRows) {
    const row = await prisma.client.upsert({ where: { clientCode: c.clientCode }, update: { name: c.name }, create: { ...c, contactPerson: 'Demo Contact', email: 'demo@klien.co.id' } });
    clientIds.push(row.id);
  }

  // ── C. 11 proyek tambahan ──
  // `profile`: healthy = di bawah anggaran (CPI>1); overrun = over (CPI<1); nobudget = tanpa ControlAccount.
  const projects = [
    { code: 'PRJ-EPC-2027-020', name: 'Jetty Extension Phase 2', entity: 'AEC-MAR', bu: 'MARINE', loc: 'Surabaya', ccy: 'IDR', value: 1_850_000_000_000, profile: 'healthy', status: 'ACTIVE' },
    { code: 'PRJ-EPC-2027-021', name: 'Dredging & Reclamation', entity: 'AEC-MAR', bu: 'MARINE', loc: 'Makassar', ccy: 'IDR', value: 960_000_000_000, profile: 'overrun', status: 'ACTIVE' },
    { code: 'PRJ-EPC-2027-022', name: 'Offshore Platform Fabrication', entity: 'AEC-MAR', bu: 'MARINE', loc: 'Batam', ccy: 'USD', value: 240_000_000, profile: 'healthy', status: 'ACTIVE' },
    { code: 'PRJ-EPC-2027-023', name: 'PLTU Unit 3 Balance of Plant', entity: 'AEC-PWR', bu: 'POWER', loc: 'Cirebon', ccy: 'IDR', value: 3_100_000_000_000, profile: 'overrun', status: 'ACTIVE' },
    { code: 'PRJ-EPC-2027-024', name: 'Gas Turbine Installation', entity: 'AEC-PWR', bu: 'POWER', loc: 'Gresik', ccy: 'USD', value: 310_000_000, profile: 'healthy', status: 'ON_HOLD' },
    { code: 'PRJ-EPC-2027-025', name: 'Substation EPC 150kV', entity: 'AEC-PWR', bu: 'POWER', loc: 'Bekasi', ccy: 'IDR', value: 780_000_000_000, profile: 'overrun', status: 'ACTIVE' },
    { code: 'PRJ-EPC-2027-026', name: 'Transmission Line 70km', entity: 'AEC-PWR', bu: 'POWER', loc: 'Sumatra', ccy: 'IDR', value: 1_240_000_000_000, profile: 'healthy', status: 'ACTIVE' },
    { code: 'PRJ-EPC-2027-027', name: 'Refinery Revamp', entity: 'AEC-CON', bu: 'PROCESS', loc: 'Balikpapan', ccy: 'IDR', value: 2_450_000_000_000, profile: 'healthy', status: 'ACTIVE' },
    { code: 'PRJ-EPC-2027-028', name: 'Tank Farm Expansion', entity: 'AEC-CON', bu: 'PROCESS', loc: 'Tuban', ccy: 'IDR', value: 640_000_000_000, profile: 'overrun', status: 'COMPLETED' },
    { code: 'PRJ-EPC-2027-029', name: 'Early Works — Site Prep', entity: 'AEC-CON', bu: 'PROCESS', loc: 'Kalimantan', ccy: 'IDR', value: 120_000_000_000, profile: 'nobudget', status: 'PLANNING' },
    { code: 'PRJ-EPC-2027-030', name: 'Feasibility & Basic Eng.', entity: 'AEC-CON', bu: 'PROCESS', loc: 'Jakarta', ccy: 'IDR', value: 45_000_000_000, profile: 'nobudget', status: 'PLANNING' },
  ] as const;

  const createdProjectIds: { id: string; profile: string; code: string }[] = [];
  for (const p of projects) {
    const legalEntityId = entityByCode.get(p.entity);
    if (!legalEntityId) continue;
    const existing = await prisma.project.findUnique({ where: { code: p.code } });
    const project = existing ?? (await prisma.project.create({
      data: {
        code: p.code, name: p.name, client: clientRows[0]!.name, legalEntityId, businessUnit: p.bu, location: p.loc,
        currency: p.ccy, contractValue: p.value, advanceAmount: Math.round(p.value * 0.1), advanceRecoveryRate: 10,
        status: p.status, director: 'Ir. Demo', manager: 'PM Demo',
      },
    }));
    createdProjectIds.push({ id: project.id, profile: p.profile, code: p.code });

    // WBS + Budget PUBLISHED + ControlAccount (PV) — kecuali `nobudget`.
    const wbsSeed = [
      { code: '1', name: 'Engineering', amount: p.value * 0.1, costType: 'LABOR' },
      { code: '2', name: 'Procurement', amount: p.value * 0.4, costType: 'MATERIAL' },
      { code: '3', name: 'Construction', amount: p.value * 0.4, costType: 'SUBCONTRACTOR' },
      { code: '4', name: 'Commissioning', amount: p.value * 0.1, costType: 'EQUIPMENT' },
    ];
    for (const w of wbsSeed) {
      const wbs = await prisma.wbsItem.upsert({
        where: { projectId_code: { projectId: project.id, code: w.code } },
        update: {},
        create: { projectId: project.id, code: w.code, name: w.name, sortOrder: Number(w.code) },
      });
      if (p.profile === 'nobudget') continue;
      const bi = await prisma.budgetItem.findUnique({ where: { projectId_wbsItemId_costType: { projectId: project.id, wbsItemId: wbs.id, costType: w.costType } } });
      if (!bi) {
        await prisma.budgetItem.create({ data: { projectId: project.id, wbsItemId: wbs.id, costType: w.costType, amount: w.amount, status: 'PUBLISHED', version: 1 } });
      }
    }

    // Baseline v1 beku untuk proyek demo. Idempoten: hanya dibuat bila belum ada,
    // sehingga seed ulang tidak menumpuk versi.
    if (p.profile !== 'nobudget') {
      const existingBaseline = await prisma.budgetBaseline.findFirst({
        where: { projectId: project.id, version: 1 },
      });
      if (!existingBaseline) {
        const budgetRows = await prisma.budgetItem.findMany({ where: { projectId: project.id } });
        if (budgetRows.length > 0) {
          const seededBaseline = await prisma.budgetBaseline.create({
            data: {
              projectId: project.id, version: 1, status: 'FROZEN',
              label: 'Seeded baseline', frozenAt: new Date(), frozenBy: 'seed',
            },
          });
          await prisma.budgetBaselineLine.createMany({
            data: budgetRows.map((r) => ({
              baselineId: seededBaseline.id, wbsItemId: r.wbsItemId, costType: r.costType, amount: r.amount,
            })),
          });
        }
      }
    }

    // Magnitudo EVM diselaraskan agar rasio realistis:
    //   BAC  = Σ budget PUBLISHED  = p.value
    //   PV   = BAC × planned%      (ControlAccount.plannedValue)
    //   EV   = BAC × physical%     (WorkPackageProgress)
    //   AC   = dibaca ActualCostCalculator dari ledger OUT → diset = EV / CPI target
    // Proyek `nobudget` melewati blok budget/CA/EVM, tetapi tetap punya gudang,
    // ledger, NCR, dan insiden (agar tiap domain terwakili di semua proyek).
    const isNobudget = p.profile === 'nobudget';
    const bac = p.value;
    const plannedProgress = 60;
    const physicalProgress = p.profile === 'healthy' ? 62 : 38; // sehat sedikit di depan; overrun tertinggal
    const cpiTarget = p.profile === 'healthy' ? 1.1 : 0.85;
    const ev = bac * (physicalProgress / 100);
    const ac = isNobudget ? 0 : ev / cpiTarget;
    const pv = bac * (plannedProgress / 100);

    // ControlAccount (PV baseline) + WorkPackage + progress fisik — hanya bila ber-budget.
    const firstWbs = await prisma.wbsItem.findFirst({ where: { projectId: project.id, code: '3' } });
    const wbsForCa = firstWbs ?? (await prisma.wbsItem.findFirst({ where: { projectId: project.id } }));
    if (!isNobudget && wbsForCa) {
      const caCode = `CA-${p.code.slice(-3)}`;
      const existingCa = await prisma.controlAccount.findUnique({ where: { projectId_code: { projectId: project.id, code: caCode } } });
      if (!existingCa) {
        await prisma.controlAccount.create({ data: { projectId: project.id, wbsItemId: wbsForCa.id, code: caCode, name: `${p.name} — Construction`, responsibleManager: 'PM Demo', budgetAmount: pv, plannedValue: pv, status: 'ACTIVE' } });
      }
    }

    // Forecast EAC/VAC — kolom proyeksi di halaman Budget membaca tabel ini.
    // Tanpa baris di sini, EAC selalu kosong dan kolomnya tidak pernah terbukti
    // bekerja. EAC = AC + ETC; proyek overrun diproyeksikan melebihi BAC.
    if (!isNobudget) {
      const existingForecast = await prisma.forecast.findFirst({ where: { projectId: project.id } });
      if (!existingForecast) {
        const eac = p.profile === 'healthy' ? bac * 1.02 : bac * 1.12;
        const etc = Math.max(eac - ac, 0);
        await prisma.forecast.create({
          data: {
            projectId: project.id,
            version: 1,
            period: `${year}-Q4`,
            estimateAtCompletion: Math.round(eac),
            estimateToComplete: Math.round(etc),
            varianceAtCompletion: Math.round(bac - eac),
            status: 'APPROVED',
            note: 'Seed forecast (EAC)',
            createdBy: 'seed',
          },
        });
      }
    }

    const wpNumber = `WP-${p.code.slice(-3)}`;
    let wp = await prisma.constructionWorkPackage.findUnique({ where: { wpNumber } });
    if (!wp && wbsForCa) {
      wp = await prisma.constructionWorkPackage.create({
        data: { wpNumber, projectId: project.id, wbsItemId: wbsForCa.id, title: `${p.name} — Construction`, plannedQty: 1000, unit: 'EA', status: 'IN_PROGRESS' },
      });
    }
    if (wp && !isNobudget) {
      const hasProgress = await prisma.workPackageProgress.findFirst({ where: { workPackageId: wp.id } });
      if (!hasProgress) {
        await prisma.workPackageProgress.create({ data: { workPackageId: wp.id, physicalProgress, achievedQty: physicalProgress * 10, measuredBy: 'Surveyor Demo' } });
      }
    }

    // PO + VendorInvoice POSTED (rekaman pengadaan; AC sebenarnya dari ledger OUT).
    const poNumber = `PO-${p.code.slice(-3)}-900001`;
    let po = await prisma.purchaseOrder.findUnique({ where: { poNumber } });
    if (!po) {
      po = await prisma.purchaseOrder.create({
        data: { poNumber, projectId: project.id, vendor: 'PT Baja Utama', currency: p.ccy, totalAmount: p.value * 0.35, status: 'RELEASED', issuedAt: new Date(`${year}-03-01`), releasedBy: buyerUserId ?? 'system' },
      });
    }
    const invNumber = `INV-${p.code.slice(-3)}-900001`;
    const existingInv = await prisma.vendorInvoice.findUnique({ where: { invoiceNumber: invNumber } });
    if (!existingInv && !isNobudget) {
      await prisma.vendorInvoice.create({
        data: { invoiceNumber: invNumber, poId: po.id, projectId: project.id, vendor: 'PT Baja Utama', vendorInvoiceNo: invNumber, invoiceDate: new Date(`${year}-04-15`), currency: p.ccy, amount: ac, taxAmount: ac * 0.11, totalAmount: ac * 1.11, status: 'POSTED', postedAt: new Date(`${year}-04-16`), postedBy: 'admin@aec.local' },
      });
    }

    // Warehouse + stock ledger. Ledger OUT = AC (dibaca ActualCostCalculator);
    // ledger IN lebih besar agar saldo positif, kecuali satu gudang overrun
    // yang sengaja dibuat negatif sebagai sinyal data-error.
    const whCode = `WH-${p.code.slice(-3)}`;
    const wh = await prisma.warehouse.upsert({
      where: { code: whCode },
      update: {},
      create: { code: whCode, name: `Gudang ${p.loc}`, warehouseType: 'PROJECT', projectId: project.id, location: p.loc },
    });
    // Dimensi WBS untuk biaya material. Semua entri ledger di bawah adalah
    // pergerakan MATERIAL (GR/ISSUE/ADJUSTMENT), jadi alokasi yang jujur adalah
    // material → WBS material (kode '2'). Membagi rata ke WBS lain akan mengarang
    // angka; WBS non-material memang akan menunjukkan biaya 0.
    const materialWbs = await prisma.wbsItem.findFirst({
      where: { projectId: project.id, code: '2' },
      select: { id: true },
    });
    const materialWbsId = materialWbs?.id ?? null;

    const existingLedger = await prisma.stockLedgerEntry.findFirst({ where: { projectId: project.id, reference: `SEED-${whCode}` } });
    if (!existingLedger) {
      const outValue = isNobudget ? p.value * 0.02 : ac;
      const inValue = outValue * 1.25;
      await prisma.stockLedgerEntry.create({ data: { projectId: project.id, warehouseId: wh.id, wbsItemId: materialWbsId, documentType: 'GR', reference: `SEED-${whCode}`, description: 'Penerimaan material (seed)', movementType: 'IN', quantity: 1000, unitPrice: inValue / 1000, totalValue: inValue, balanceAfter: 1000 } });
      await prisma.stockLedgerEntry.create({ data: { projectId: project.id, warehouseId: wh.id, wbsItemId: materialWbsId, documentType: 'ISSUE', reference: `SEED-${whCode}`, description: 'Pemakaian material (seed)', movementType: 'OUT', quantity: 600, unitPrice: outValue / 600, totalValue: outValue, balanceAfter: 400 } });
      if (p.profile === 'overrun') {
        // Baris negatif sengaja: sinyal data-error yang harus muncul di tile inventory.
        await prisma.stockLedgerEntry.create({ data: { projectId: project.id, warehouseId: wh.id, wbsItemId: materialWbsId, documentType: 'ADJUSTMENT', reference: `SEED-${whCode}`, description: 'Koreksi stok (seed, negatif)', movementType: 'ADJUST', quantity: -500, totalValue: -outValue * 0.1, balanceAfter: -100 } });
      }
    }

    // NCR + insiden HSE tersebar (bukan satu proyek).
    const ncrNumber = `NCR-${p.code.slice(-3)}-900001`;
    const existingNcr = await prisma.ncr.findUnique({ where: { ncrNumber } });
    if (!existingNcr) {
      await prisma.ncr.create({ data: { ncrNumber, projectId: project.id, category: 'WORKMANSHIP', severity: p.profile === 'overrun' ? 'MAJOR' : 'MINOR', description: 'Ketidaksesuaian pekerjaan (seed)', status: 'OPEN' } });
    }
    const incNumber = `INC-${p.code.slice(-3)}-900001`;
    const existingInc = await prisma.hseIncident.findUnique({ where: { incidentNumber: incNumber } });
    if (!existingInc) {
      await prisma.hseIncident.create({ data: { incidentNumber: incNumber, projectId: project.id, type: 'NEAR_MISS', severity: p.profile === 'overrun' ? 'HIGH' : 'LOW', description: 'Near miss di area kerja (seed)', status: 'OPEN', reportedBy: 'HSE Demo' } });
    }

    // PR → Progress Claim → Client Invoice (aliran commercial utuh per proyek)
    // supaya tab Commercial & rantai kas punya isi nyata.
    // `requestedBy` WAJIB id user, bukan email: `approval-detail.service` meresolusi
    // nama lewat `user.findUnique({ where: { id } })`, jadi email menghasilkan
    // requesterName null di UI approval.
    const prNumber = `PR-${p.code.slice(-3)}-900001`;
    const existingPr = await prisma.purchaseRequisition.findUnique({ where: { prNumber } });
    if (!existingPr) {
      await prisma.purchaseRequisition.create({ data: { prNumber, projectId: project.id, requestedBy: buyerUserId ?? 'system', description: `Permintaan material ${p.name}`, estimatedTotal: p.value * 0.1, status: 'APPROVED' } });
    }
    const claimNumber = `CLM-${p.code.slice(-3)}-900001`;
    let claim = await prisma.progressClaim.findUnique({ where: { claimNumber } });
    if (!claim) {
      claim = await prisma.progressClaim.create({ data: { claimNumber, projectId: project.id, claimDate: new Date(`${year}-05-01`), period: `${year}-04`, description: 'Progress klaim (seed)', amount: p.value * 0.1, certifiedAmount: p.value * 0.1, status: 'CERTIFIED', certifiedBy: 'admin@aec.local', certifiedAt: new Date(`${year}-05-03`) } });
    }

    /**
     * Riwayat klaim per kuartal. Satu klaim saja membuat kurva aktual hanya
     * satu titik, sehingga S-curve tidak bisa dibaca sebagai kurva. Ini data
     * demo: nilai mengikuti kurva S yang wajar (landai → menengah → landai),
     * berhenti di progres aktual proyek, bukan mengarang angka acak.
     */
    const curveWeights = [0.08, 0.16, 0.24, 0.28, 0.24];
    const progressShare = (p.profile === 'healthy' ? 62 : 38) / 100;
    for (let qi = 0; qi < curveWeights.length; qi += 1) {
      const qNum = qi + 1;
      const period = `${year}-Q${qNum}`;
      const histNumber = `CLM-${p.code.slice(-3)}-9${String(qNum).padStart(5, '0')}`;
      const existsHist = await prisma.progressClaim.findUnique({ where: { claimNumber: histNumber } });
      if (existsHist) continue;
      // Kumulatif dibatasi agar tidak melewati progres aktual proyek.
      const cumShare = Math.min(progressShare, curveWeights.slice(0, qi + 1).reduce((s, w) => s + w, 0));
      const prevCum = Math.min(progressShare, curveWeights.slice(0, qi).reduce((s, w) => s + w, 0));
      const delta = Math.max(0, (cumShare - prevCum) * p.value);
      if (delta <= 0) continue;
      const claimDate = new Date(`${year}-${String(qNum * 3).padStart(2, '0')}-15`);
      await prisma.progressClaim.create({
        data: {
          claimNumber: histNumber,
          projectId: project.id,
          claimDate,
          period,
          description: `Progress klaim ${period} (seed)`,
          amount: delta,
          certifiedAmount: delta,
          physicalProgressAtClaim: Math.round(cumShare * 1000) / 10,
          status: 'CERTIFIED',
          certifiedBy: 'admin@aec.local',
          certifiedAt: claimDate,
        },
      });
    }
    const ciNumber = `CINV-${p.code.slice(-3)}-900001`;
    const existingCi = await prisma.clientInvoice.findUnique({ where: { invoiceNumber: ciNumber } });
    if (!existingCi && claim) {
      await prisma.clientInvoice.create({ data: { invoiceNumber: ciNumber, projectId: project.id, claimId: claim.id, client: clientRows[0]!.name, invoiceDate: new Date(`${year}-05-05`), currency: p.ccy, amount: p.value * 0.1, totalAmount: p.value * 0.111, status: 'POSTED', postedAt: new Date(`${year}-05-06`), postedBy: 'admin@aec.local' } });
    }

    // Risk terdaftar (kecuali proyek sehat) — supaya heatmap tidak kosong.
    if (p.profile !== 'healthy') {
      const riskNumber = `RSK-${p.code.slice(-3)}-900001`;
      const existingRisk = await prisma.risk.findUnique({ where: { riskNumber } });
      if (!existingRisk) {
        await prisma.risk.create({ data: { riskNumber, projectId: project.id, title: `Risiko keterlambatan ${p.name}`, category: p.profile === 'overrun' ? 'SCHEDULE' : 'TECHNICAL', likelihood: p.profile === 'overrun' ? 4 : 3, impact: p.profile === 'overrun' ? 4 : 3, score: p.profile === 'overrun' ? 16 : 9, owner: 'PM Demo', mitigation: 'Percepat pengadaan & tambah tenaga', status: 'OPEN' } });
      }
    }

    // Dokumen engineering (drawing + deliverable) — dasar tab Documents.
    const drawingNumber = `DRW-${p.code.slice(-3)}-900001`;
    const existingDrawing = await prisma.drawing.findUnique({ where: { drawingNumber } });
    if (!existingDrawing) {
      await prisma.drawing.create({ data: { drawingNumber, projectId: project.id, title: `General Arrangement ${p.name}`, discipline: 'CIVIL', currentRevision: 'A', status: 'PUBLISHED', isIFC: true } });
    }
    const deliverableNumber = `DLV-${p.code.slice(-3)}-900001`;
    const existingDeliv = await prisma.deliverable.findUnique({ where: { deliverableNumber } });
    if (!existingDeliv) {
      await prisma.deliverable.create({ data: { deliverableNumber, projectId: project.id, title: `Design Package ${p.name}`, discipline: 'CIVIL', engineer: 'Dewi Lestari', status: 'SUBMITTED', plannedDate: new Date(`${year}-03-15`) } });
    }
  }
  console.log(`Portfolio: ${createdProjectIds.length} proyek di 3 entitas (healthy/overrun/nobudget)`);

  // ── D. Equipment utilization tersebar di beberapa proyek ──
  const crane = await prisma.equipment.findFirst({ where: { category: 'HEAVY' } });
  if (crane) {
    for (const p of createdProjectIds.slice(0, 4)) {
      const existing = await prisma.equipmentUtilization.findFirst({ where: { equipmentId: crane.id, projectId: p.id } });
      if (!existing) {
        await prisma.equipmentUtilization.create({ data: { equipmentId: crane.id, projectId: p.id, utilizationDate: new Date(now.getTime() - 86_400_000), availableHours: 10, operatingHours: 7, description: 'Seed utilization' } });
      }
    }
    console.log('EquipmentUtilization: 4 proyek');
  }

  // ── E. Opportunity funnel (semua tahap + menang/kalah) ──
  const oppSeed = [
    { stage: 'LEAD', value: 120_000_000_000, status: 'OPEN', prob: 10 },
    { stage: 'LEAD', value: 85_000_000_000, status: 'OPEN', prob: 10 },
    { stage: 'QUALIFIED', value: 240_000_000_000, status: 'OPEN', prob: 30 },
    { stage: 'QUALIFIED', value: 160_000_000_000, status: 'OPEN', prob: 30 },
    { stage: 'PROPOSAL', value: 410_000_000_000, status: 'OPEN', prob: 55 },
    { stage: 'NEGOTIATION', value: 320_000_000_000, status: 'OPEN', prob: 75 },
    { stage: 'WON', value: 275_000_000_000, status: 'CLOSED_WON', prob: 100 },
    { stage: 'WON', value: 150_000_000_000, status: 'CLOSED_LOST', prob: 0 },
  ] as const;
  let oppCount = 0;
  for (let i = 0; i < oppSeed.length; i++) {
    const o = oppSeed[i]!;
    const oppNumber = `OPP-${year}-9000${String(i + 1).padStart(2, '0')}`;
    const existing = await prisma.opportunity.findUnique({ where: { oppNumber } });
    if (!existing) {
      await prisma.opportunity.create({
        data: { oppNumber, clientId: clientIds[i % clientIds.length]!, title: `Peluang ${o.stage} ${i + 1}`, stage: o.stage, probability: o.prob, expectedValue: o.value, owner: 'BD Demo', status: o.status, expectedDate: new Date(`${year + 1}-03-01`) },
      });
      oppCount++;
    }
  }
  console.log(`Opportunity: +${oppCount} (funnel LEAD→WON + won/lost)`);
}

/**
 * Tim proyek & jadwal (FR-HCM-002 / FR-PRJ-001).
 *
 * Mengisi dua celah data nyata yang membuat halaman Projects tak bermakna:
 *  - SEMUA proyek sebelumnya tanpa `startDate`/`completionDate` → view Timeline mati.
 *  - TIDAK ADA `ProjectAssignment` → tak satu pun proyek punya tim, sehingga
 *    pertanyaan "siapa mengerjakan, sebagai apa" tak bisa dijawab.
 *
 * Idempoten: proyek hanya diisi tanggalnya bila kosong; assignment di-upsert per
 * (employee, project, startDate). Menambah ~8 karyawan lintas posisi agar tim
 * punya orang yang berbeda-beda (bukan satu nama berulang).
 */
async function seedProjectTeams() {
  const year = new Date().getFullYear();
  const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
  const entities = await prisma.legalEntity.findMany({ select: { id: true, code: true } });
  const entityByCode = new Map(entities.map((e) => [e.code, e.id]));
  const conId = entityByCode.get('AEC-CON') ?? entities[0]?.id;
  if (!conId) throw new Error('LegalEntity tidak ada — jalankan seed dasar dulu.');

  // ── A. Karyawan lintas posisi (idempoten per employeeNumber) ──
  const employees: Array<{ no: string; name: string; position: string; grade: string; department: string; entity?: string }> = [
    { no: '000001', name: 'Budi Santoso', position: 'Project Director', grade: 'L4', department: 'Executive' },
    { no: '000002', name: 'Siti Rahayu', position: 'Project Controls Manager', grade: 'L3', department: 'Project Controls' },
    { no: '000003', name: 'Ahmad Fauzi', position: 'Project Manager', grade: 'L3', department: 'Construction' },
    { no: '000004', name: 'Dewi Lestari', position: 'Site Engineer', grade: 'L2', department: 'Engineering' },
    { no: '000005', name: 'Rudi Hartono', position: 'QA/QC Engineer', grade: 'L2', department: 'Quality' },
    { no: '000006', name: 'Rina Marlina', position: 'HSE Officer', grade: 'L2', department: 'HSE' },
    { no: '000007', name: 'Hendra Gunawan', position: 'Procurement Lead', grade: 'L3', department: 'Procurement' },
    { no: '000008', name: 'Fajar Nugroho', position: 'Cost Engineer', grade: 'L2', department: 'Project Controls' },
    { no: '000009', name: 'Putri Anggraini', position: 'Document Controller', grade: 'L1', department: 'Project Controls' },
    { no: '000010', name: 'Yusuf Maulana', position: 'Construction Superintendent', grade: 'L3', department: 'Construction', entity: 'AEC-MAR' },
  ];
  const employeeIdByNo = new Map<string, string>();
  for (const e of employees) {
    const employeeNumber = `EMP-${year}-${e.no}`;
    const row = await prisma.employee.upsert({
      where: { employeeNumber },
      update: { name: e.name, position: e.position, grade: e.grade, department: e.department },
      create: { employeeNumber, name: e.name, position: e.position, grade: e.grade, department: e.department, legalEntityId: entityByCode.get(e.entity ?? 'AEC-CON') ?? conId, status: 'ACTIVE' },
    });
    employeeIdByNo.set(e.no, row.id);
  }
  console.log(`[teams] Employees: ${employees.length}`);

  // ── B. Jadwal proyek (isi tanggal yang kosong) + manager/director sebagai orang ──
  // Rentang sengaja beragam (selesai, berjalan, akan datang) agar timeline bermakna.
  const schedule: Record<string, { start: string; end: string; status?: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CLOSED'; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; managerNo?: string; directorNo?: string }> = {
    'PRJ-EPC-2027-014': { start: `${year - 1}-03-01`, end: `${year + 2}-09-30`, status: 'ACTIVE', priority: 'CRITICAL', managerNo: '000003', directorNo: '000001' },
    'PRJ-EPC-2027-020': { start: `${year}-01-15`, end: `${year + 1}-08-31`, status: 'ACTIVE', priority: 'HIGH', managerNo: '000003', directorNo: '000001' },
    'PRJ-EPC-2027-021': { start: `${year}-02-01`, end: `${year + 1}-02-28`, status: 'ACTIVE', priority: 'MEDIUM', managerNo: '000003', directorNo: '000001' },
    'PRJ-EPC-2027-022': { start: `${year}-04-01`, end: `${year + 2}-03-31`, status: 'ACTIVE', priority: 'HIGH', managerNo: '000003', directorNo: '000001' },
    'PRJ-EPC-2027-023': { start: `${year - 1}-06-01`, end: `${year + 1}-12-31`, status: 'ACTIVE', priority: 'CRITICAL', managerNo: '000003', directorNo: '000001' },
    'PRJ-EPC-2027-024': { start: `${year}-03-01`, end: `${year + 1}-06-30`, status: 'ON_HOLD', priority: 'MEDIUM', managerNo: '000003', directorNo: '000001' },
    'PRJ-EPC-2027-025': { start: `${year}-05-01`, end: `${year + 1}-10-31`, status: 'ACTIVE', priority: 'HIGH', managerNo: '000003', directorNo: '000001' },
    'PRJ-EPC-2027-026': { start: `${year}-07-01`, end: `${year + 2}-06-30`, status: 'ACTIVE', priority: 'MEDIUM', managerNo: '000003', directorNo: '000001' },
    'PRJ-EPC-2027-027': { start: `${year - 1}-09-01`, end: `${year + 1}-03-31`, status: 'ACTIVE', priority: 'HIGH', managerNo: '000003', directorNo: '000001' },
    'PRJ-EPC-2027-028': { start: `${year - 2}-04-01`, end: `${year - 1}-11-30`, status: 'COMPLETED', priority: 'LOW', managerNo: '000003', directorNo: '000001' },
    'PRJ-EPC-2027-029': { start: `${year + 1}-01-01`, end: `${year + 1}-06-30`, status: 'PLANNING', priority: 'LOW', managerNo: '000003' },
    'PRJ-EPC-2027-030': { start: `${year + 1}-02-01`, end: `${year + 1}-08-31`, status: 'PLANNING', priority: 'LOW' },
  };
  const projects = await prisma.project.findMany({ select: { id: true, code: true, startDate: true, completionDate: true } });
  let dated = 0;
  const projectIdByCode = new Map<string, string>();
  for (const p of projects) {
    projectIdByCode.set(p.code, p.id);
    const s = schedule[p.code];
    if (!s) continue;
    const data: Record<string, unknown> = {};
    if (!p.startDate) data.startDate = d(s.start);
    if (!p.completionDate) data.completionDate = d(s.end);
    if (s.status) data.status = s.status;
    if (s.priority) data.priority = s.priority;
    if (s.managerNo && employeeIdByNo.get(s.managerNo)) data.managerId = employeeIdByNo.get(s.managerNo);
    if (s.directorNo && employeeIdByNo.get(s.directorNo)) data.directorId = employeeIdByNo.get(s.directorNo);
    if (Object.keys(data).length > 0) {
      await prisma.project.update({ where: { id: p.id }, data });
      if (!p.startDate || !p.completionDate) dated += 1;
    }
  }
  console.log(`[teams] Projects dated: ${dated} (timeline hidup)`);

  // ── C. Tim per proyek (assignment dengan role + alokasi) ──
  const teamByProject: Record<string, Array<{ no: string; role: string; alloc: number; key?: boolean }>> = {
    'PRJ-EPC-2027-014': [
      { no: '000003', role: 'Project Manager', alloc: 60, key: true },
      { no: '000004', role: 'Lead Site Engineer', alloc: 100, key: true },
      { no: '000005', role: 'QA/QC Engineer', alloc: 50 },
      { no: '000006', role: 'HSE Officer', alloc: 50 },
      { no: '000008', role: 'Cost Engineer', alloc: 40 },
      { no: '000009', role: 'Document Controller', alloc: 30 },
    ],
    'PRJ-EPC-2027-020': [
      { no: '000010', role: 'Construction Superintendent', alloc: 80, key: true },
      { no: '000004', role: 'Site Engineer', alloc: 40 },
      { no: '000006', role: 'HSE Officer', alloc: 30 },
    ],
    'PRJ-EPC-2027-021': [
      { no: '000004', role: 'Site Engineer', alloc: 60, key: true },
      { no: '000007', role: 'Procurement Lead', alloc: 40 },
    ],
    'PRJ-EPC-2027-023': [
      { no: '000010', role: 'Construction Superintendent', alloc: 60, key: true },
      { no: '000005', role: 'QA/QC Engineer', alloc: 50 },
      { no: '000008', role: 'Cost Engineer', alloc: 60, key: true },
      { no: '000002', role: 'Project Controls Manager', alloc: 30 },
    ],
    'PRJ-EPC-2027-027': [
      { no: '000004', role: 'Lead Site Engineer', alloc: 80, key: true },
      { no: '000007', role: 'Procurement Lead', alloc: 30 },
      { no: '000009', role: 'Document Controller', alloc: 40 },
    ],
  };
  let assignments = 0;
  for (const [code, team] of Object.entries(teamByProject)) {
    const projectId = projectIdByCode.get(code);
    if (!projectId) continue;
    const s = schedule[code];
    const start = d(s?.start ?? `${year}-01-01`);
    for (const t of team) {
      const employeeId = employeeIdByNo.get(t.no);
      if (!employeeId) continue;
      const existing = await prisma.projectAssignment.findFirst({ where: { employeeId, projectId, status: 'ACTIVE' } });
      if (existing) continue;
      await prisma.projectAssignment.create({
        data: { employeeId, projectId, role: t.role, allocationPercent: t.alloc, startDate: start, isKeyMember: t.key ?? false },
      });
      assignments += 1;
    }
  }
  console.log(`[teams] ProjectAssignment: +${assignments} (tim per proyek)`);
}

/**
 * Siklus hidup proyek (FR-PRJ-007): fase, milestone, stage-gate, time-phased
 * budget, progress fisik, stakeholder, dan kalender. Idempoten — tiap bagian
 * hanya diisi bila belum ada.
 */
async function seedProjectLifecycle() {
  const year = new Date().getFullYear();
  const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
  const addMonths = (iso: string, months: number) => {
    const dt = new Date(`${iso}T00:00:00.000Z`);
    dt.setUTCMonth(dt.getUTCMonth() + months);
    return dt;
  };

  const projects = await prisma.project.findMany({
    select: { id: true, code: true, startDate: true, completionDate: true, contractValue: true, phase: true, status: true },
    orderBy: { code: 'asc' },
  });

  // Profil fase & progress per proyek (kaya: ada yang maju, ada yang tertinggal).
  const profileByCode: Record<string, { phase: string; planned: number; actual: number; health: string; tagline: string; watchlist?: string }> = {
    'PRJ-EPC-2027-014': { phase: 'CONSTRUCTION', planned: 55, actual: 48, health: 'AT_RISK', tagline: 'EPC fasilitas pengolahan industri — struktur & MEP', watchlist: 'Progress 7 pts di belakang rencana' },
    'PRJ-EPC-2027-020': { phase: 'CONSTRUCTION', planned: 40, actual: 45, health: 'ON_TRACK', tagline: 'Perpanjangan jetty fase 2 — pekerjaan laut' },
    'PRJ-EPC-2027-021': { phase: 'CONSTRUCTION', planned: 50, actual: 34, health: 'CRITICAL', tagline: 'Pengerukan & reklamasi — Makassar', watchlist: 'Tertinggal 16 pts, biaya overrun' },
    'PRJ-EPC-2027-022': { phase: 'PROCUREMENT', planned: 30, actual: 33, health: 'ON_TRACK', tagline: 'Fabrikasi platform lepas pantai — Batam' },
    'PRJ-EPC-2027-023': { phase: 'CONSTRUCTION', planned: 60, actual: 41, health: 'CRITICAL', tagline: 'PLTU Unit 3 balance of plant — Cirebon', watchlist: 'Tertinggal 19 pts' },
    'PRJ-EPC-2027-024': { phase: 'ENGINEERING', planned: 35, actual: 35, health: 'ON_HOLD', tagline: 'Instalasi gas turbin — ditahan sementara', watchlist: 'Proyek di-hold' },
    'PRJ-EPC-2027-025': { phase: 'PROCUREMENT', planned: 45, actual: 38, health: 'AT_RISK', tagline: 'Substation EPC 150kV — Bekasi', watchlist: 'Tertinggal 7 pts' },
    'PRJ-EPC-2027-026': { phase: 'ENGINEERING', planned: 20, actual: 22, health: 'ON_TRACK', tagline: 'Transmission line 70 km — Sumatra' },
    'PRJ-EPC-2027-027': { phase: 'CONSTRUCTION', planned: 70, actual: 68, health: 'ON_TRACK', tagline: 'Revamp kilang — Balikpapan' },
    'PRJ-EPC-2027-028': { phase: 'CLOSEOUT', planned: 100, actual: 100, health: 'COMPLETED', tagline: 'Ekspansi tank farm — Tuban (selesai)' },
    'PRJ-EPC-2027-029': { phase: 'INITIATION', planned: 5, actual: 3, health: 'ON_TRACK', tagline: 'Pekerjaan awal — persiapan lahan' },
    'PRJ-EPC-2027-030': { phase: 'FEED', planned: 10, actual: 9, health: 'ON_TRACK', tagline: 'Studi kelayakan & basic engineering' },
  };

  let updated = 0;
  for (const p of projects) {
    const prof = profileByCode[p.code];
    if (!prof) continue;
    await prisma.project.update({
      where: { id: p.id },
      data: {
        phase: prof.phase as never,
        healthStatus: prof.health as never,
        progressPlanned: prof.planned,
        progressActual: prof.actual,
        tagline: prof.tagline,
        isWatchlist: prof.watchlist != null,
        watchlistReason: prof.watchlist ?? null,
      },
    });
    updated += 1;
  }
  console.log(`[lifecycle] Projects phased: ${updated}`);

  // ── Riwayat fase: dari INITIATION menuju fase saat ini (agar ribbon bermakna) ──
  const PHASE_ORDER = ['INITIATION', 'FEED', 'ENGINEERING', 'PROCUREMENT', 'CONSTRUCTION', 'COMMISSIONING', 'CLOSEOUT'];
  for (const p of projects) {
    const prof = profileByCode[p.code];
    if (!prof) continue;
    const existing = await prisma.projectPhaseHistory.count({ where: { projectId: p.id } });
    if (existing > 1) continue; // sudah kaya
    const targetIdx = PHASE_ORDER.indexOf(prof.phase);
    const startIso = (p.startDate ?? new Date()).toISOString().slice(0, 10);
    // Bersihkan backfill tunggal agar riwayat bisa dibangun ulang secara benar.
    await prisma.projectPhaseHistory.deleteMany({ where: { projectId: p.id } });
    for (let i = 0; i <= targetIdx; i++) {
      const entered = addMonths(startIso, i * 3);
      const exited = i < targetIdx ? addMonths(startIso, (i + 1) * 3) : null;
      await prisma.projectPhaseHistory.create({
        data: { projectId: p.id, phase: PHASE_ORDER[i] as never, enteredAt: entered, exitedAt: exited, movedById: 'seed', note: i === 0 ? 'Project initiated' : 'Phase advanced' },
      });
    }
  }
  console.log('[lifecycle] Phase history built');

  // ── Milestone per proyek (rencana vs aktual; sebagian telat) ──
  const MILESTONES = ['Design Freeze', 'Procurement Award', 'Construction Start', 'Mechanical Completion', 'Handover'];
  let msCount = 0;
  for (const p of projects) {
    const prof = profileByCode[p.code];
    if (!prof) continue;
    const existing = await prisma.projectMilestone.count({ where: { projectId: p.id } });
    if (existing > 0) continue;
    const startIso = (p.startDate ?? new Date()).toISOString().slice(0, 10);
    const targetIdx = PHASE_ORDER.indexOf(prof.phase);
    for (let i = 0; i < MILESTONES.length; i++) {
      const planned = addMonths(startIso, i * 6 + 3);
      // Milestone yang fasenya sudah lewat → ACHIEVED (sebagian telat), sisanya PLANNED.
      const passed = i <= targetIdx;
      const late = passed && prof.health !== 'ON_TRACK' && i === targetIdx;
      const actual = passed ? addMonths(planned.toISOString().slice(0, 10), late ? 2 : 0) : null;
      await prisma.projectMilestone.create({
        data: {
          projectId: p.id, name: MILESTONES[i]!, plannedDate: planned,
          actualDate: actual, status: (passed ? 'ACHIEVED' : 'PLANNED') as never,
          weight: 20, isCritical: i === 2 || i === 3, sortOrder: i,
          notes: late ? 'Completed later than planned' : null,
        },
      });
      msCount += 1;
    }
  }
  console.log(`[lifecycle] Milestones: +${msCount}`);

  // ── Stage-gate review (fase yang sudah dilewati) ──
  let gateCount = 0;
  for (const p of projects) {
    const prof = profileByCode[p.code];
    if (!prof) continue;
    const existing = await prisma.stageGateReview.count({ where: { projectId: p.id } });
    if (existing > 0) continue;
    const targetIdx = PHASE_ORDER.indexOf(prof.phase);
    for (let i = 0; i < targetIdx; i++) {
      const decision = prof.health === 'ON_TRACK' ? 'GO' : (i === targetIdx - 1 && prof.health === 'CRITICAL' ? 'HOLD' : 'GO');
      await prisma.stageGateReview.create({
        data: { projectId: p.id, gate: `G${i + 1} ${PHASE_ORDER[i + 1]}`, phase: PHASE_ORDER[i + 1] as never, decision: decision as never, reviewerId: 'seed', decidedAt: addMonths((p.startDate ?? new Date()).toISOString().slice(0, 10), (i + 1) * 3), notes: decision === 'HOLD' ? 'Conditional — rework required' : 'Approved' },
      });
      gateCount += 1;
    }
  }
  console.log(`[lifecycle] Stage gates: +${gateCount}`);

  // ── Time-phased budget: bagi nilai kontrak menjadi kurva S (mengikuti progress) ──
  let periodCount = 0;
  for (const p of projects) {
    const existing = await prisma.projectPeriodBudget.count({ where: { projectId: p.id } });
    if (existing > 0) continue;
    const value = Number(p.contractValue ?? 0);
    if (value <= 0) continue;
    const startIso = (p.startDate ?? new Date()).toISOString().slice(0, 10);
    const start = new Date(`${startIso}T00:00:00.000Z`);
    // Kurva S: distribusi berbobot per kuartal (awal & akhir landai, tengah tinggi).
    const weights = [0.05, 0.12, 0.2, 0.26, 0.2, 0.12, 0.05];
    for (let q = 0; q < weights.length; q++) {
      const dt = new Date(start);
      dt.setUTCMonth(dt.getUTCMonth() + q * 3);
      const period = `${dt.getUTCFullYear()}-Q${Math.floor(dt.getUTCMonth() / 3) + 1}`;
      await prisma.projectPeriodBudget.create({ data: { projectId: p.id, period, plannedCost: Math.round(value * weights[q]!) } });
      periodCount += 1;
    }
  }
  console.log(`[lifecycle] Period budget rows: +${periodCount}`);

  // ── Stakeholder (RACI) ──
  let shCount = 0;
  for (const p of projects) {
    const existing = await prisma.projectStakeholder.count({ where: { projectId: p.id } });
    if (existing > 0) continue;
    const rows = [
      { name: 'Budi Santoso', role: 'Project Sponsor', raci: 'ACCOUNTABLE', isPrimary: true, email: 'sponsor@aec.local' },
      { name: 'Ahmad Fauzi', role: 'Project Manager', raci: 'RESPONSIBLE', isPrimary: true, email: 'pm@aec.local' },
      { name: 'Siti Rahayu', role: 'Project Controls', raci: 'CONSULTED', isPrimary: false, email: 'controls@aec.local' },
      { name: 'Client Representative', role: 'Client Rep', raci: 'INFORMED', isPrimary: false, email: 'client@klien.co.id' },
    ];
    for (const r of rows) {
      await prisma.projectStakeholder.create({ data: { projectId: p.id, ...r } });
      shCount += 1;
    }
  }
  console.log(`[lifecycle] Stakeholders: +${shCount}`);

  // ── Kalender kerja: tandai akhir pekan sebagai non-working day (contoh) ──
  let calCount = 0;
  for (const p of projects) {
    const existing = await prisma.projectCalendar.count({ where: { projectId: p.id } });
    if (existing > 0) continue;
    const start = new Date(`${(p.startDate ?? new Date()).toISOString().slice(0, 10)}T00:00:00.000Z`);
    for (let i = 0; i < 30; i++) {
      const dt = new Date(start);
      dt.setUTCDate(dt.getUTCDate() + i);
      const dow = dt.getUTCDay();
      await prisma.projectCalendar.create({ data: { projectId: p.id, date: dt, isWorkingDay: dow !== 0 && dow !== 6, note: dow === 0 || dow === 6 ? 'Weekend' : null } });
      calCount += 1;
    }
  }
  console.log(`[lifecycle] Calendar days: +${calCount}`);
}

/**
 * Kedalaman jadwal (FR-PRJ-004): jadwal WBS, paket kerja (ControlAccount) dengan
 * dependency FS berurutan + critical path + baseline, dan work package ber-jadwal.
 * Idempoten — hanya mengisi yang belum ada.
 *
 * Tanpa ini, Gantt hanya punya baris fase & milestone; paket kerja & WP kosong
 * (kolom tanggalnya ada tapi tak pernah diisi).
 */
async function seedProjectSchedule() {
  const d = (dt: Date) => new Date(dt);
  const addDays = (dt: Date, days: number) => new Date(dt.getTime() + days * 86_400_000);

  const projects = await prisma.project.findMany({
    select: { id: true, code: true, startDate: true, completionDate: true },
    orderBy: { code: 'asc' },
  });

  // Tahap kerja standar EPC (relatif mulai proyek) — proporsi dari durasi proyek.
  const STAGES = [
    { code: 'ENG', name: 'Engineering & Design', frac: [0.0, 0.2] },
    { code: 'PROC', name: 'Procurement & Delivery', frac: [0.15, 0.55] },
    { code: 'CONS', name: 'Construction', frac: [0.4, 0.85] },
    { code: 'COMM', name: 'Commissioning', frac: [0.8, 1.0] },
  ];

  let caCount = 0;
  let wpCount = 0;
  let wbsCount = 0;

  for (const p of projects) {
    const start = p.startDate ?? new Date();
    const end = p.completionDate ?? addDays(start, 365);
    const span = Math.max(end.getTime() - start.getTime(), 86_400_000);
    const at = (frac: number) => new Date(start.getTime() + span * frac);

    // ── A. Jadwal WBS (rencana) ──
    const wbsItems = await prisma.wbsItem.findMany({ where: { projectId: p.id }, orderBy: { sortOrder: 'asc' } });
    const wbsByCode = new Map(wbsItems.map((w) => [w.code, w]));
    for (let i = 0; i < STAGES.length; i++) {
      const stage = STAGES[i]!;
      const wbs = wbsByCode.get(String(i + 1)) ?? wbsItems[i];
      if (!wbs) continue;
      if (wbs.plannedStart && wbs.plannedEnd) continue;
      await prisma.wbsItem.update({ where: { id: wbs.id }, data: { plannedStart: at(stage.frac[0]!), plannedEnd: at(stage.frac[1]!) } });
      wbsCount += 1;
    }

    // ── B. ControlAccount per tahap: jadwal + baseline + dependency + critical path ──
    let predecessorId: string | null = null;
    for (let i = 0; i < STAGES.length; i++) {
      const stage = STAGES[i]!;
      const wbs = wbsByCode.get(String(i + 1)) ?? wbsItems[i];
      if (!wbs) continue;
      const code = `CA-${p.code.slice(-3)}-${stage.code}`;
      const plannedStart = at(stage.frac[0]!);
      const plannedEnd = at(stage.frac[1]!);
      // Sebagian tahap telat (slippage): Construction/Commissioning bergeser.
      const slipDays = i >= 2 ? 21 : 0;
      const baselineStart = addDays(plannedStart, -slipDays);
      const baselineEnd = addDays(plannedEnd, -slipDays);
      const existing = await prisma.controlAccount.findUnique({ where: { projectId_code: { projectId: p.id, code } } });
      let caId: string;
      if (existing) {
        caId = existing.id;
        await prisma.controlAccount.update({
          where: { id: caId },
          data: { scheduleStart: plannedStart, scheduleEnd: plannedEnd, baselineStart, baselineEnd, predecessorId, isCriticalPath: i < 3, progressPercent: i === 0 ? 100 : i === 1 ? 70 : i === 2 ? 35 : 0 },
        });
      } else {
        const ca = await prisma.controlAccount.create({
          data: {
            projectId: p.id, wbsItemId: wbs.id, code, name: stage.name, responsibleManager: 'PM Demo',
            budgetAmount: 0, plannedValue: 0, scheduleStart: plannedStart, scheduleEnd: plannedEnd,
            baselineStart, baselineEnd, predecessorId, isCriticalPath: i < 3,
            progressPercent: i === 0 ? 100 : i === 1 ? 70 : i === 2 ? 35 : 0, status: 'ACTIVE',
          },
        });
        caId = ca.id;
        caCount += 1;
      }
      predecessorId = caId;
    }

    // ── C. Work package ber-jadwal + baseline + progress ──
    const wpNumber = `WP-${p.code.slice(-3)}`;
    const wp = await prisma.constructionWorkPackage.findUnique({ where: { wpNumber } });
    if (wp && (!wp.startDate || !wp.endDate)) {
      const s = at(0.4);
      const e = at(0.85);
      const progress = await prisma.workPackageProgress.findFirst({ where: { workPackageId: wp.id }, orderBy: { progressDate: 'desc' } });
      await prisma.constructionWorkPackage.update({
        where: { id: wp.id },
        data: { startDate: s, endDate: e, baselineStart: addDays(s, -21), baselineEnd: addDays(e, -21), isCriticalPath: true },
      });
      wpCount += 1;
      void progress;
    }
  }
  console.log(`[schedule] WBS dated: ${wbsCount}, ControlAccounts: +${caCount}, WorkPackages dated: ${wpCount}`);
}

async function main() {
  const entity = await prisma.legalEntity.findUnique({ where: { code: 'AEC-CON' } });
  if (!entity) throw new Error('Seed base dulu: pnpm --filter @aec/api db:seed');

  // ── 1. Vendor master ──
  // Dulu blok ini meng-upsert kode `VND-<year>-000001..000005` dengan nama dari
  // daftar di bawah. Masalahnya kode yang sama sudah dipakai `seed.ts`
  // (`seedMasterData`) untuk vendor yang BERBEDA dan berurutan lain, sehingga
  // `update: { name }` menimpa nama lama. Hasilnya satu vendor hilang
  // (CV Karya Konstruksi Mandiri) dan satu jadi ganda (PT Logistik Prima).
  //
  // Kelima vendor ini sudah dibuat `seed.ts`, jadi tidak ada yang perlu dibuat di
  // sini — cukup diambil. Lookup by name membuat seed ini tidak menyentuh baris
  // milik seed dasar, berapa kali pun dijalankan.
  const vendors = ['PT Baja Utama', 'PT Semen Nasional', 'PT Mekanik Jaya', 'PT Elektrik Sejahtera', 'PT Logistik Prima'];
  const vendorRows = await prisma.vendor.findMany({
    where: { name: { in: vendors } },
    orderBy: { vendorCode: 'asc' },
  });
  const missingVendors = vendors.filter((name) => !vendorRows.some((v) => v.name === name));
  if (missingVendors.length > 0) {
    console.warn(`Vendor: belum ada di master (jalankan seed dasar dulu): ${missingVendors.join(', ')}`);
  }
  console.log(`Vendor: ${vendorRows.length} dipakai (dari master, tidak dibuat ulang)`);

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
  console.log(`Client: ${client.name} | Contract: ${contract.contractNumber} (${Number(contract.value).toLocaleString('id-ID')})`);

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
    console.log(`PO released: ${po.poNumber} (${Number(po.totalAmount).toLocaleString('id-ID')}) linked to PR ${prId ? 'yes' : 'no'}`);
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

  // ── 5b. Ledger material massal (OUT ≈ EV) ──
  // Tanpa ini, AC proyek 014 hanya dari invoice kecil (75 M) padahal budget 4.8 T,
  // sehingga "Budget used" ~1,5% dan CPI meledak (~30) — angka yang tak masuk akal
  // untuk proyek unggulan. Di sini AC disetel ≈ EV pada progress 48% agar CPI ≈ 1.
  const massIn = await prisma.stockLedgerEntry.findFirst({ where: { projectId: project.id, reference: 'SEED-014-IN' } });
  if (!massIn) {
    const evTarget = 4800000000000 * 0.48; // ≈ earned value pada progress 48%
    const acTarget = Math.round(evTarget / 1.02); // CPI ≈ 1,02
    await prisma.stockLedgerEntry.create({ data: { projectId: project.id, wbsItemId: wbsMap.get('2'), warehouseId: warehouse.id, movementType: 'IN', quantity: 120000, unit: 'ton', unitPrice: (acTarget * 1.3) / 120000, totalValue: acTarget * 1.3, documentType: 'GR', reference: 'SEED-014-IN', description: 'Penerimaan material massal (seed)', balanceAfter: 120000 } });
    await prisma.stockLedgerEntry.create({ data: { projectId: project.id, wbsItemId: wbsMap.get('3'), warehouseId: warehouse.id, movementType: 'OUT', quantity: 70000, unit: 'ton', unitPrice: acTarget / 70000, totalValue: acTarget, documentType: 'ISSUE', reference: 'SEED-014-OUT', description: 'Pemakaian material massal (seed)', balanceAfter: 50000 } });
    console.log(`Ledger massal 014: OUT ≈ ${(acTarget / 1e12).toFixed(2)} T (CPI ≈ 1)`);
  }

  // Forecast EAC/VAC untuk PRJ-014. Proyek ini dibuat oleh blok tersendiri, bukan
  // loop portfolio, jadi tanpa blok ini kolom proyeksi selalu kosong di proyek
  // unggulan. EAC sedikit di atas BAC: proyek berjalan mendekati anggaran.
  const demoForecast = await prisma.forecast.findFirst({ where: { projectId: project.id } });
  if (!demoForecast) {
    const demoBac = 4_800_000_000_000;
    const demoEac = Math.round(demoBac * 1.04);
    await prisma.forecast.create({
      data: {
        projectId: project.id,
        version: 1,
        period: `${year}-Q4`,
        estimateAtCompletion: demoEac,
        estimateToComplete: Math.round(demoEac * 0.5),
        varianceAtCompletion: demoBac - demoEac,
        status: 'APPROVED',
        note: 'Seed forecast (EAC)',
        createdBy: 'seed',
      },
    });
    console.log(`Forecast 014: EAC ${(demoEac / 1e12).toFixed(2)} T`);
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
            // Dimensi WBS hanya untuk baris beban material; baris PPN dan utang
            // tidak punya dimensi WBS.
            { accountId: expense.id, description: 'Pembelian material', debit: 75000000000, credit: 0, projectId: project.id, wbsItemId: wbsMap.get('2') ?? null },
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
    { client: 'PT Klien Utama', amount: 12_000_000_000, daysAgo: 25, paidPct: 0 },
    { client: 'PT Klien Utama', amount: 9_000_000_000, daysAgo: 55, paidPct: 50 },
    { client: 'PT Nusantara Energi', amount: 14_000_000_000, daysAgo: 70, paidPct: 0 },
    { client: 'PT Nusantara Energi', amount: 6_000_000_000, daysAgo: 100, paidPct: 0 },
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

  // ── 9. Treasury: bank account + cash position + cash forecast ──
  let bank = await prisma.bankAccount.findFirst({ where: { legalEntityId: entity.id } });
  if (!bank) {
    bank = await prisma.bankAccount.create({
      data: { accountCode: `BANK-${year}-000001`, legalEntityId: entity.id, bankCode: 'BCA', bankName: 'Bank Central Asia', accountNumber: '8880-7777-1111', accountName: 'PT AEC Construction', currency: 'IDR', openingBalance: 500000000000 },
    });
    console.log('BankAccount: BCA 500M');
  }
  // FR-DASH-004: CashPosition adalah sumber "Cash on hand" di dashboard. Tanpa
  // baris ini angka juara dashboard selalu 0.
  const existingPos = await prisma.cashPosition.findFirst({ where: { bankAccountId: bank.id } });
  if (!existingPos) {
    await prisma.cashPosition.create({
      data: { bankAccountId: bank.id, legalEntityId: entity.id, currency: 'IDR', currentBalance: 18_240_500_000, lastUpdated: now },
    });
    console.log('CashPosition: Rp 18,2B');
  } else if (Number(existingPos.currentBalance) === 0) {
    await prisma.cashPosition.update({ where: { id: existingPos.id }, data: { currentBalance: 18_240_500_000, lastUpdated: now } });
    console.log('CashPosition: diisi Rp 18,2B');
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

  // ── 11b. Operational exceptions (FR-DASH-005) ──
  // NCR, insiden HSE, corrective action, dan risk tambahan supaya Exception
  // Queue + pulse domain (Quality/HSE/Governance) dashboard terisi nyata.
  const ncrCount = await prisma.ncr.count();
  if (ncrCount === 0) {
    const ncrs = [
      { severity: 'CRITICAL', category: 'WORKMANSHIP', age: 34 },
      { severity: 'MAJOR', category: 'MATERIAL', age: 12 },
      { severity: 'MINOR', category: 'DOCUMENT', age: 5 },
    ];
    for (const [i, n] of ncrs.entries()) {
      const created = new Date(now.getTime() - n.age * 86_400_000);
      await prisma.ncr.create({
        data: {
          ncrNumber: `NCR-${year}-${String(i + 1).padStart(6, '0')}`, projectId: project.id,
          category: n.category, severity: n.severity, description: `Non-conformance: ${n.category.toLowerCase()}`,
          status: 'OPEN', reinspectionRequired: true, createdAt: created,
        },
      });
    }
    console.log(`NCR: ${ncrs.length} (1 CRITICAL)`);
  }
  const incCount = await prisma.hseIncident.count();
  if (incCount === 0) {
    const incs = [
      { severity: 'HIGH', type: 'INJURY', age: 5 },
      { severity: 'MEDIUM', type: 'NEAR_MISS', age: 2 },
      { severity: 'LOW', type: 'PROPERTY', age: 1 },
    ];
    let firstIncidentId: string | null = null;
    for (const [i, inc] of incs.entries()) {
      const created = new Date(now.getTime() - inc.age * 86_400_000);
      const row = await prisma.hseIncident.create({
        data: {
          incidentNumber: `INC-${year}-${String(i + 1).padStart(6, '0')}`, projectId: project.id,
          incidentDate: created, type: inc.type, severity: inc.severity,
          description: `${inc.type} reported on site`, status: i === 0 ? 'INVESTIGATING' : 'OPEN',
          reportedBy: 'Safety Officer', createdAt: created,
        },
      });
      if (i === 0) firstIncidentId = row.id;
    }
    // Corrective action yang sudah lewat tenggat → muncul di Exception Queue.
    if (firstIncidentId) {
      await prisma.correctiveAction.create({
        data: {
          sourceType: 'INCIDENT', sourceId: firstIncidentId, incidentId: firstIncidentId,
          action: 'Install additional edge protection', owner: 'HSE Manager',
          dueDate: new Date(now.getTime() - 3 * 86_400_000), status: 'OPEN',
          createdAt: new Date(now.getTime() - 10 * 86_400_000),
        },
      });
    }
    console.log(`HseIncident: ${incs.length} + 1 corrective action overdue`);
  }
  const riskCount2 = await prisma.risk.count();
  if (riskCount2 < 5) {
    const extraRisks = [
      { title: 'Cuaca ekstrem musim hujan', category: 'SCHEDULE', l: 3, i: 4 },
      { title: 'Fluktuasi kurs material import', category: 'FINANCIAL', l: 4, i: 3 },
      { title: 'Ketersediaan tenaga ahli las', category: 'TECHNICAL', l: 3, i: 3 },
      { title: 'Perizinan lingkungan terlambat', category: 'HSE', l: 2, i: 4 },
    ];
    for (const [i, r] of extraRisks.entries()) {
      await prisma.risk.create({
        data: {
          riskNumber: `RSK-${year}-${String(i + 2).padStart(6, '0')}`, projectId: project.id,
          title: r.title, category: r.category, likelihood: r.l, impact: r.i, score: r.l * r.i,
          owner: 'Risk Officer', mitigation: 'Monitoring berkala', status: 'OPEN',
        },
      });
    }
    console.log('Risk: +4 (matriks L×I terisi)');
  }

  // Equipment utilization + daily report supaya pulse HCM terisi.
  const utilCount = await prisma.equipmentUtilization.count();
  if (utilCount === 0) {
    const eq = await prisma.equipment.findFirst({ where: { equipmentNumber: `EQ-${year}-000001` } });
    if (eq) {
      for (let d = 0; d < 6; d++) {
        await prisma.equipmentUtilization.create({
          data: {
            equipmentId: eq.id, projectId: project.id,
            utilizationDate: new Date(now.getTime() - d * 86_400_000),
            availableHours: 10, operatingHours: 7 + (d % 3),
          },
        });
      }
      console.log('EquipmentUtilization: 6 hari (~71%)');
    }
  }
  const drCount = await prisma.constructionDailyReport.count();
  if (drCount === 0) {
    for (let d = 0; d < 3; d++) {
      await prisma.constructionDailyReport.create({
        data: {
          drNumber: `DR-${year}-EPC-${String(d + 1).padStart(6, '0')}`, projectId: project.id,
          reportDate: new Date(now.getTime() - d * 86_400_000), summary: 'Pekerjaan struktur & ME berjalan',
          manpowerTotal: 1240 - d * 20, weather: 'CERAH', reportedBy: 'Site Manager',
        },
      });
    }
    console.log('DailyReport: 3 hari (manpower 1.240)');
  }

  // ── 12. KPI targets (FR-DASH-001) ──
  // Target per periode berjalan; tanpa ini dashboard hanya menampilkan angka
  // telanjang tanpa acuan "vs target".
  const fyPeriod = `FY${year}`;
  const qPeriod = `${year}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
  const kpiTargets = [
    { metric: 'cash.min', target: 15000000000, direction: 'MIN', label: 'Cash on hand minimum' },
    { metric: 'cashflow.net.min', target: 500000000, direction: 'MIN', label: 'Net cash flow minimum' },
    { metric: 'backlog.min', target: 35000000000, direction: 'MIN', label: 'Contract backlog minimum' },
    { metric: 'budget.remaining.min', target: 5000000000, direction: 'MIN', label: 'Budget remaining minimum' },
    { metric: 'ar.overdue.max', target: 2500000000, direction: 'MAX', label: 'AR overdue 61+ ceiling' },
    { metric: 'dso.max', target: 45, direction: 'MAX', label: 'DSO ceiling' },
    { metric: 'safety.trir.max', target: 1.5, direction: 'MAX', label: 'TRIR ceiling' },
    { metric: 'manpower.min', target: 1000, direction: 'MIN', label: 'Manpower minimum' },
  ];
  for (const t of kpiTargets) {
    for (const period of [fyPeriod, qPeriod]) {
      await prisma.kpiTarget.upsert({
        where: { legalEntityId_metric_period: { legalEntityId: entity.id, metric: t.metric, period } },
        update: { target: t.target, direction: t.direction },
        create: { legalEntityId: entity.id, metric: t.metric, period, target: t.target, direction: t.direction },
      });
    }
  }
  console.log(`KpiTarget: ${kpiTargets.length} metrik x ${fyPeriod}/${qPeriod}`);

  // ── 13. Demo user roles ──
  // Identitas kerja lengkap (jabatan/departemen/telepon) + role yang BENAR-BENAR
  // ter-assign + preferensi + riwayat login, supaya halaman User Management
  // menjawab "ini siapa, sebagai apa" dengan data nyata (bukan kosong).
  const demoUsers = [
    { email: 'ceo@aec.local', name: 'Budi Raharjo', jobTitle: 'Chief Executive Officer', department: 'Executive', phone: '+62 811 1000 001', role: 'SUPER_ADMIN' },
    { email: 'cfo@aec.local', name: 'Sari Wulandari', jobTitle: 'Chief Financial Officer', department: 'Finance', phone: '+62 811 1000 002', role: 'SUPER_ADMIN' },
    { email: 'pm@aec.local', name: 'Andi Pratama', jobTitle: 'Project Manager', department: 'Construction', phone: '+62 811 1000 003', role: 'PROCUREMENT_MANAGER' },
  ];
  for (const u of demoUsers) {
    const hash = await bcrypt.hash('Demo123!', 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { displayName: u.name, jobTitle: u.jobTitle, department: u.department, phone: u.phone, legalEntityId: entity.id },
      create: {
        username: u.email.split('@')[0] ?? u.email, email: u.email, displayName: u.name, passwordHash: hash,
        legalEntityId: entity.id, status: 'ACTIVE',
        jobTitle: u.jobTitle, department: u.department, phone: u.phone,
      },
    });
    // Preferensi default.
    await prisma.userSetting.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
    // Role benar-benar di-assign (idempoten).
    const role = await prisma.role.findUnique({ where: { code: u.role } });
    if (role) {
      const assigned = await prisma.userRole.findFirst({ where: { userId: user.id, roleId: role.id, effectiveTo: null } });
      if (!assigned) {
        await prisma.userRole.create({
          data: { userId: user.id, roleId: role.id, effectiveFrom: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), assignedById: 'seed', reason: 'Demo seed' },
        });
      }
    }
    // Riwayat login demo (SUCCESS + satu gagal) agar timeline punya isi.
    const loginCount = await prisma.loginEvent.count({ where: { userId: user.id } });
    if (loginCount === 0) {
      await prisma.loginEvent.createMany({
        data: [
          { userId: user.id, email: u.email, type: 'SUCCESS', ipAddress: '10.0.0.12', userAgent: 'Mozilla/5.0 (demo)', at: new Date(now.getTime() - 3 * 86400000) },
          { userId: user.id, email: u.email, type: 'SUCCESS', ipAddress: '10.0.0.12', userAgent: 'Mozilla/5.0 (demo)', at: new Date(now.getTime() - 1 * 86400000) },
          { userId: user.id, email: u.email, type: 'FAILED_PASSWORD', ipAddress: '10.0.0.12', userAgent: 'Mozilla/5.0 (demo)', reason: 'Incorrect password', at: new Date(now.getTime() - 1 * 86400000 + 3600000) },
        ],
      });
    }
  }
  console.log('Demo users: ceo/cfo/pm @aec.local / Demo123! (identitas + role + login history)');

  // ── 13b. Portfolio multi-entitas (proyek, EVM baseline, inventory, funnel) ──
  await seedPortfolio();

  // ── 13c. Tim proyek & jadwal (tanggal + assignment) ──
  await seedProjectTeams();

  // ── 13d. Siklus hidup proyek (fase, milestone, gate, budget, stakeholder) ──
  await seedProjectLifecycle();

  // ── 13e. Kedalaman jadwal (WBS, ControlAccount, dependency, baseline) ──
  await seedProjectSchedule();

  // ── 14. Workflow demo: versi (DRAFT/ACTIVE/ARCHIVED) + task tersebar ──
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
