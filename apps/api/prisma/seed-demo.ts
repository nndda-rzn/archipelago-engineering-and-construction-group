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
  }

  const wbsSeed = [
    { code: '1', name: 'Engineering', amount: 480000000000 },
    { code: '2', name: 'Procurement', amount: 1920000000000 },
    { code: '3', name: 'Construction', amount: 1920000000000 },
    { code: '4', name: 'Commissioning', amount: 480000000000 },
  ];
  const wbsMap = new Map<string, string>();
  for (const w of wbsSeed) {
    const wbs = await prisma.wbsItem.upsert({
      where: { projectId_code: { projectId: project.id, code: w.code } },
      update: {},
      create: { projectId: project.id, code: w.code, name: w.name, sortOrder: Number(w.code) },
    });
    wbsMap.set(w.code, wbs.id);
    // budget item (PUBLISHED) per WBS
    const existing = await prisma.budgetItem.findUnique({ where: { projectId_wbsItemId_costType: { projectId: project.id, wbsItemId: wbs.id, costType: 'DIRECT' } } });
    if (!existing) {
      await prisma.budgetItem.create({ data: { projectId: project.id, wbsItemId: wbs.id, costType: 'DIRECT', amount: w.amount, status: 'PUBLISHED', version: 1 } });
    }
  }
  console.log(`Project: ${project.code} + WBS ${wbsMap.size} + budget 4.8T PUBLISHED`);

  // ── 4. PO released (commitment) ──
  const demoPo = await prisma.purchaseOrder.findUnique({ where: { poNumber: `PO-${year}-EPC-900001` } });
  if (!demoPo) {
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${year}-EPC-900001`, projectId: project.id, vendor: 'PT Baja Utama', totalAmount: 150000000000,
        status: 'RELEASED', issuedAt: now, releasedBy: 'system',
        items: { create: [{ description: 'Structural Steel', quantity: 5000, unit: 'ton', unitPrice: 30000000, totalPrice: 150000000000, wbsItemId: wbsMap.get('2') }] },
      },
    });
    console.log(`PO released: ${po.poNumber} (${po.totalAmount.toLocaleString('id-ID')})`);
  } else {
    console.log(`PO released: ${demoPo.poNumber} sudah ada`);
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

  // ── 9. Treasury: bank account + cash forecast ──
  const bankCount = await prisma.bankAccount.count();
  if (bankCount === 0) {
    await prisma.bankAccount.create({
      data: { accountCode: `BANK-${year}-000001`, legalEntityId: entity.id, bankCode: 'BCA', bankName: 'Bank Central Asia', accountNumber: '8880-7777-1111', accountName: 'PT AEC Construction', currency: 'IDR', openingBalance: 500000000000 },
    });
    console.log('BankAccount: BCA 500M');
  }
  const cfCount = await prisma.cashForecast.count();
  if (cfCount === 0) {
    await prisma.cashForecast.create({
      data: { forecastCode: `CF-${year}-000001`, legalEntityId: entity.id, period: `${year}-09`, expectedReceipt: 200000000000, expectedAp: 100000000000, expectedPayroll: 25000000000, netForecast: 75000000000 },
    });
    console.log('CashForecast: 2026-09 net 75M');
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

  console.log('\n=== DEMO SEED SELESAI ===');
  console.log('Login demo: admin@aec.local / Admin123! (super user)');
  console.log('Dashboard: /analytics, /project-controls, /treasury, /finance/closure');
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
