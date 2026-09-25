import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/shared/database/prisma.service';
import {
  createTestApp,
  loginAs,
  auth,
  getFirstLegalEntityId,
  createProject,
  createWbs,
  createWarehouse,
  setBudgetItem,
  publishBudget,
} from './app.helper';

/**
 * Uji konkurensi untuk guard TOCTOU / double-action yang ditutup oleh:
 *  - withSerializableRetry (transaksi Serializable + retry) pada create issue/transfer/PR,
 *  - compare-and-set (updateMany ber-guard status) pada approve/decide.
 *
 * Setiap kasus menjalankan 2 request PARALEL dan memastikan tepat satu yang menang.
 *
 * Fixture memakai PROJECT/WBS/WAREHOUSE SENDIRI (bukan seed bersama) supaya tiap test
 * terisolasi: budget bisa di-publish ulang antartest tanpa saling menabrak
 * `BUDGET_PUBLISHED` / `PROJECT_EXISTS`.
 */

function statuses(res: { status: number }[]): number[] {
  return res.map((r) => r.status).sort((a, b) => a - b);
}

describe('Concurrency guards (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let buyerToken: string;

  // Fixture khusus suite ini.
  let projectId: string;
  let legalEntityId: string;
  let warehouseId: string;
  let wbsBudget: string; // WBS untuk test budget PR (T13) — budget di-publish di test itu.
  let wbsIssue: string; // WBS untuk test material issue (T1).
  let wbsApproval: string; // WBS untuk test approval task (T9).
  let wbsAdj: string; // WBS untuk test stock adjustment (T2).
  let wbsInvoice: string;
  let wbsGl: string; // WBS untuk test akun GL hilang (T14).
  let wbsDup: string; // WBS untuk test agregasi baris bucket sama (T15).
  // Project terpisah untuk uji reservasi AP/AR (T17/T18) supaya tidak berebut status budget.
  let projectApAr: string;
  let wbsApAr: string;
  let warehouseApAr: string;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await loginAs(app, 'admin@aec.local', 'Admin123!');
    buyerToken = await loginAs(app, 'buyer@aec.local', 'Buyer123!');

    legalEntityId = await getFirstLegalEntityId(app, adminToken);
    projectId = await createProject(app, adminToken, legalEntityId, 'PRJ-E2E-CONC');
    wbsBudget = await createWbs(app, adminToken, projectId, '1', 'Concurrency Budget');
    wbsIssue = await createWbs(app, adminToken, projectId, '2', 'Concurrency Issue');
    wbsApproval = await createWbs(app, adminToken, projectId, '3', 'Concurrency Approval');
    wbsAdj = await createWbs(app, adminToken, projectId, '4', 'Concurrency Adjustment');
    wbsInvoice = await createWbs(app, adminToken, projectId, '5', 'Concurrency Invoice');
    wbsGl = await createWbs(app, adminToken, projectId, '6', 'Concurrency GL Account');
    wbsDup = await createWbs(app, adminToken, projectId, '7', 'Concurrency Duplicate Lines');
    warehouseId = await createWarehouse(app, adminToken, projectId, 'WH-E2E-CONC', 'Warehouse Concurrency');

    projectApAr = await createProject(app, adminToken, legalEntityId, 'PRJ-E2E-APAR');
    wbsApAr = await createWbs(app, adminToken, projectApAr, '1', 'AP AR Reservation');
    warehouseApAr = await createWarehouse(app, adminToken, projectApAr, 'WH-E2E-APAR', 'Warehouse AP AR');
  });

  afterAll(async () => {
    await app.close();
  });

  it('T13: dua PR paralel tidak boleh overcommit budget (Serializable)', async () => {
    const budgetSet = await setBudgetItem(app, adminToken, projectId, wbsBudget, 100_000_000);
    expect(budgetSet.status).toBe(201);
    const published = await publishBudget(app, adminToken, projectId);
    expect(published.status).toBe(201);

    // masing-masing 60% budget; bersama-sama > budget -> satu harus gagal.
    const make = () =>
      request(app.getHttpServer())
        .post('/api/v1/purchase-requisitions')
        .set('Authorization', auth(adminToken))
        .send({
          projectId,
          wbsItemId: wbsBudget,
          requestedBy: 'e2e-concurrency',
          items: [{ description: 'concurrency PR', quantity: 1, unit: 'EA', estimatedUnitPrice: 60_000_000 }],
        });

    const [a, b] = await Promise.all([make(), make()]);
    const codes = statuses([a, b]);

    expect(codes).toEqual([201, 409]);
    const failed = a.status === 409 ? a : b;
    expect(failed.body.error.code).toBe('BUDGET_EXCEEDED');
  });

  it('T2: dua approve stock-adjustment paralel -> tepat satu sukses', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/stock-adjustments')
      .set('Authorization', auth(adminToken))
      .send({
        projectId,
        warehouseId,
        reasonCode: 'SURPLUS',
        items: [{ description: 'concurrency adj', quantity: 1, unit: 'EA', wbsItemId: wbsAdj }],
      });
    expect(create.status).toBe(201);
    const adjId = create.body.id as string;

    const approve = () =>
      request(app.getHttpServer())
        .post(`/api/v1/stock-adjustments/${adjId}/approve`)
        .set('Authorization', auth(adminToken));

    const [a, b] = await Promise.all([approve(), approve()]);
    const codes = statuses([a, b]);

    expect(codes).toEqual([201, 409]);
    const failed = a.status === 409 ? a : b;
    expect(failed.body.error.code).toBe('NOT_DRAFT');
  });

  it('T1: dua material-issue paralel tidak boleh membuat stok minus (Serializable)', async () => {
    // Siapkan stok = 1 unit lewat adjustment positif yang di-approve (mengisi ledger).
    const adj = await request(app.getHttpServer())
      .post('/api/v1/stock-adjustments')
      .set('Authorization', auth(adminToken))
      .send({
        projectId,
        warehouseId,
        reasonCode: 'SURPLUS',
        items: [{ description: 'seed stok issue', quantity: 1, unit: 'EA', wbsItemId: wbsIssue }],
      });
    expect(adj.status).toBe(201);
    const approved = await request(app.getHttpServer())
      .post(`/api/v1/stock-adjustments/${adj.body.id}/approve`)
      .set('Authorization', auth(adminToken));
    expect(approved.status).toBe(201);

    // Dua issue masing-masing qty 1 dengan stok hanya 1 -> tepat satu sukses.
    const issue = () =>
      request(app.getHttpServer())
        .post('/api/v1/material-issues')
        .set('Authorization', auth(adminToken))
        .send({
          projectId,
          warehouseId,
          issuedTo: 'e2e-concurrency',
          items: [{ description: 'concurrency issue', quantity: 1, unit: 'EA', wbsItemId: wbsIssue }],
        });

    const [a, b] = await Promise.all([issue(), issue()]);
    const codes = statuses([a, b]);

    expect(codes).toEqual([201, 409]);
    const failed = a.status === 409 ? a : b;
    expect(failed.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('T9: dua approve task approval paralel -> tepat satu sukses', async () => {
    const budgetSet = await setBudgetItem(app, adminToken, projectId, wbsApproval, 100_000_000);
    expect(budgetSet.status).toBe(201);
    const published = await publishBudget(app, adminToken, projectId);
    expect(published.status).toBe(201);

    // buyer membuat PR (DRAFT), lalu submit untuk approval.
    const pr = await request(app.getHttpServer())
      .post('/api/v1/purchase-requisitions')
      .set('Authorization', auth(buyerToken))
      .send({
        projectId,
        wbsItemId: wbsApproval,
        requestedBy: 'e2e-buyer',
        items: [{ description: 'approval task concurrency', quantity: 1, unit: 'EA', estimatedUnitPrice: 1_000 }],
      });
    expect(pr.status).toBe(201);

    const submit = await request(app.getHttpServer())
      .post('/api/v1/approvals/submit')
      .set('Authorization', auth(buyerToken))
      .send({ transactionType: 'PurchaseRequisition', transactionId: pr.body.id, approverRoleCode: 'PROCUREMENT_MANAGER' });
    expect(submit.status).toBe(201);
    const taskId = submit.body.id as string;

    // admin (PROCUREMENT_MANAGER) memutuskan; dua paralel -> hanya satu menang.
    const decide = () =>
      request(app.getHttpServer())
        .post('/api/v1/approvals/decide')
        .set('Authorization', auth(adminToken))
        .send({ taskId, decision: 'APPROVE', comment: 'e2e concurrency' });

    const [a, b] = await Promise.all([decide(), decide()]);
    const codes = statuses([a, b]);

    expect(codes).toEqual([201, 409]);
    const failed = a.status === 409 ? a : b;
    expect(failed.body.error.code).toBe('TASK_NOT_PENDING');
  });

  it('T5: dua vendor invoice tidak boleh mengklaim penerimaan yang sama', async () => {
    const budget = await setBudgetItem(app, adminToken, projectId, wbsInvoice, 1_000_000);
    expect(budget.status).toBe(201);
    expect((await publishBudget(app, adminToken, projectId)).status).toBe(201);

    const pr = await request(app.getHttpServer()).post('/api/v1/purchase-requisitions')
      .set('Authorization', auth(buyerToken))
      .send({ projectId, wbsItemId: wbsInvoice, requestedBy: 'invoice-test',
        items: [{ description: 'invoice material', quantity: 1, unit: 'EA', estimatedUnitPrice: 100 }] });
    expect(pr.status).toBe(201);
    const submitted = await request(app.getHttpServer()).post('/api/v1/approvals/submit')
      .set('Authorization', auth(buyerToken))
      .send({ transactionType: 'PurchaseRequisition', transactionId: pr.body.id, approverRoleCode: 'PROCUREMENT_MANAGER' });
    expect(submitted.status).toBe(201);
    expect((await request(app.getHttpServer()).post('/api/v1/approvals/decide')
      .set('Authorization', auth(adminToken)).send({ taskId: submitted.body.id, decision: 'APPROVE' })).status).toBe(201);

    const po = await request(app.getHttpServer()).post('/api/v1/purchase-orders')
      .set('Authorization', auth(adminToken)).send({ requisitionId: pr.body.id, vendor: 'Vendor Test' });
    expect(po.status).toBe(201);
    const poApproval = await request(app.getHttpServer()).post('/api/v1/approvals/submit')
      .set('Authorization', auth(buyerToken))
      .send({ transactionType: 'PurchaseOrder', transactionId: po.body.id, approverRoleCode: 'PROCUREMENT_MANAGER' });
    expect(poApproval.status).toBe(201);
    expect((await request(app.getHttpServer()).post('/api/v1/approvals/decide')
      .set('Authorization', auth(adminToken)).send({ taskId: poApproval.body.id, decision: 'APPROVE' })).status).toBe(201);
    const release = () => request(app.getHttpServer()).post(`/api/v1/purchase-orders/${po.body.id}/release`)
      .set('Authorization', auth(adminToken));
    const [releaseA, releaseB] = await Promise.all([release(), release()]);
    expect(statuses([releaseA, releaseB])).toEqual([201, 409]);

    const receive = () => request(app.getHttpServer()).post('/api/v1/goods-receipts')
      .set('Authorization', auth(adminToken))
      .send({ poId: po.body.id, warehouseId,
        items: [{ poItemId: po.body.items[0].id, quantity: 1, wbsItemId: wbsInvoice }] });
    const [grA, grB] = await Promise.all([receive(), receive()]);
    expect(statuses([grA, grB])).toEqual([201, 409]);
    expect((grA.status === 409 ? grA : grB).body.error.code).toBe('OVER_RECEIPT');

    const invoice = (no: string) => request(app.getHttpServer()).post('/api/v1/vendor-invoices')
      .set('Authorization', auth(adminToken))
      .send({ poId: po.body.id, vendorInvoiceNo: no,
        items: [{ poItemId: po.body.items[0].id, quantity: 1, unitPrice: 100 }] });
    const [first, second] = await Promise.all([invoice('INVOICE-A'), invoice('INVOICE-B')]);
    expect(statuses([first, second])).toEqual([201, 409]);
    expect((first.status === 409 ? first : second).body.error.code).toBe('THREE_WAY_MISMATCH');

    const accepted = first.status === 201 ? first : second;
    const post = () => request(app.getHttpServer()).post(`/api/v1/vendor-invoices/${accepted.body.id}/post`)
      .set('Authorization', auth(adminToken));
    const [postA, postB] = await Promise.all([post(), post()]);
    expect(statuses([postA, postB])).toEqual([201, 409]);
    const journals = await app.get(PrismaService).journal.count({
      where: { source: 'INVOICE', sourceId: accepted.body.id },
    });
    expect(journals).toBe(1);
  });

  it('T14: akun GL AP tidak aktif -> post 409 GL_ACCOUNT_MISSING, status tetap MATCHED, tanpa jurnal', async () => {
    const prisma = app.get(PrismaService);
    const budget = await setBudgetItem(app, adminToken, projectId, wbsGl, 1_000_000);
    expect(budget.status).toBe(201);
    expect((await publishBudget(app, adminToken, projectId)).status).toBe(201);

    const pr = await request(app.getHttpServer()).post('/api/v1/purchase-requisitions')
      .set('Authorization', auth(buyerToken))
      .send({ projectId, wbsItemId: wbsGl, requestedBy: 'gl-test',
        items: [{ description: 'gl material', quantity: 1, unit: 'EA', estimatedUnitPrice: 100 }] });
    expect(pr.status).toBe(201);
    const submitted = await request(app.getHttpServer()).post('/api/v1/approvals/submit')
      .set('Authorization', auth(buyerToken))
      .send({ transactionType: 'PurchaseRequisition', transactionId: pr.body.id, approverRoleCode: 'PROCUREMENT_MANAGER' });
    expect(submitted.status).toBe(201);
    expect((await request(app.getHttpServer()).post('/api/v1/approvals/decide')
      .set('Authorization', auth(adminToken)).send({ taskId: submitted.body.id, decision: 'APPROVE' })).status).toBe(201);

    const po = await request(app.getHttpServer()).post('/api/v1/purchase-orders')
      .set('Authorization', auth(adminToken)).send({ requisitionId: pr.body.id, vendor: 'Vendor GL' });
    expect(po.status).toBe(201);
    const poApproval = await request(app.getHttpServer()).post('/api/v1/approvals/submit')
      .set('Authorization', auth(buyerToken))
      .send({ transactionType: 'PurchaseOrder', transactionId: po.body.id, approverRoleCode: 'PROCUREMENT_MANAGER' });
    expect(poApproval.status).toBe(201);
    expect((await request(app.getHttpServer()).post('/api/v1/approvals/decide')
      .set('Authorization', auth(adminToken)).send({ taskId: poApproval.body.id, decision: 'APPROVE' })).status).toBe(201);
    expect((await request(app.getHttpServer()).post(`/api/v1/purchase-orders/${po.body.id}/release`)
      .set('Authorization', auth(adminToken))).status).toBe(201);

    const gr = await request(app.getHttpServer()).post('/api/v1/goods-receipts')
      .set('Authorization', auth(adminToken))
      .send({ poId: po.body.id, warehouseId,
        items: [{ poItemId: po.body.items[0].id, quantity: 1, wbsItemId: wbsGl }] });
    expect(gr.status).toBe(201);

    const invoice = await request(app.getHttpServer()).post('/api/v1/vendor-invoices')
      .set('Authorization', auth(adminToken))
      .send({ poId: po.body.id, vendorInvoiceNo: 'INVOICE-GL',
        items: [{ poItemId: po.body.items[0].id, quantity: 1, unitPrice: 100 }] });
    expect(invoice.status).toBe(201);
    expect(invoice.body.status).toBe('MATCHED');
    const invoiceId = invoice.body.id as string;

    const apAccounts = await prisma.chartOfAccount.findMany({
      where: { legalEntityId, code: { startsWith: '210' } },
      select: { id: true },
    });
    expect(apAccounts.length).toBeGreaterThan(0);

    try {
      // Akun AP dinonaktifkan → posting wajib GAGAL, bukan diam-diam tanpa jurnal.
      await prisma.chartOfAccount.updateMany({
        where: { legalEntityId, code: { startsWith: '210' } },
        data: { isActive: false },
      });

      const post = await request(app.getHttpServer())
        .post(`/api/v1/vendor-invoices/${invoiceId}/post`)
        .set('Authorization', auth(adminToken));

      expect(post.status).toBe(409);
      expect(post.body.error.code).toBe('GL_ACCOUNT_MISSING');

      // Bukti invariant: status tidak berubah dan tidak ada jurnal setengah jadi.
      const after = await prisma.vendorInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
      expect(after.status).toBe('MATCHED');
      expect(await prisma.journal.count({ where: { source: 'INVOICE', sourceId: invoiceId } })).toBe(0);
    } finally {
      await prisma.chartOfAccount.updateMany({
        where: { legalEntityId, code: { startsWith: '210' } },
        data: { isActive: true },
      });
    }

    // Kontrol positif: setelah akun dipulihkan, post yang sama berhasil dan berjurnal tepat 1.
    const retryPost = await request(app.getHttpServer())
      .post(`/api/v1/vendor-invoices/${invoiceId}/post`)
      .set('Authorization', auth(adminToken));
    expect(retryPost.status).toBe(201);
    expect(retryPost.body.status).toBe('POSTED');
    expect(await prisma.journal.count({ where: { source: 'INVOICE', sourceId: invoiceId } })).toBe(1);
  });

  it('T15: dua baris bucket stok SAMA yang totalnya melebihi saldo -> 409 INSUFFICIENT_STOCK', async () => {
    // Seed stok 10 pada bucket khusus lewat adjustment positif yang di-approve.
    const adj = await request(app.getHttpServer())
      .post('/api/v1/stock-adjustments')
      .set('Authorization', auth(adminToken))
      .send({
        projectId,
        warehouseId,
        reasonCode: 'SURPLUS',
        items: [{ description: 'seed stok dup', quantity: 10, unit: 'EA', wbsItemId: wbsDup }],
      });
    expect(adj.status).toBe(201);
    expect((await request(app.getHttpServer())
      .post(`/api/v1/stock-adjustments/${adj.body.id}/approve`)
      .set('Authorization', auth(adminToken))).status).toBe(201);

    // Dua baris 8 + 8 pada bucket yang sama. Tiap baris (8) masih <= stok (10), sehingga
    // tanpa agregasi per bucket keduanya lolos dan saldo menjadi -6.
    const issue = await request(app.getHttpServer())
      .post('/api/v1/material-issues')
      .set('Authorization', auth(adminToken))
      .send({
        projectId,
        warehouseId,
        issuedTo: 'e2e-dup-bucket',
        items: [
          { description: 'dup A', quantity: 8, unit: 'EA', wbsItemId: wbsDup },
          { description: 'dup B', quantity: 8, unit: 'EA', wbsItemId: wbsDup },
        ],
      });

    expect(issue.status).toBe(409);
    expect(issue.body.error.code).toBe('INSUFFICIENT_STOCK');

    // Bukti: tidak ada dokumen setengah jadi dan saldo bucket tidak berkurang.
    expect(await app.get(PrismaService).materialIssue.count({
      where: { projectId, issuedTo: 'e2e-dup-bucket' },
    })).toBe(0);
  });

  it('T16: ID invoice duplikat dalam satu request ditolak validasi DTO -> 400', async () => {
    const payment = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', auth(adminToken))
      .send({
        projectId,
        vendor: 'PT Duplikat',
        items: [
          { invoiceId: 'inv-sama', amount: 80 },
          { invoiceId: 'inv-sama', amount: 80 },
        ],
      });

    expect(payment.status).toBe(400);

    const collection = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', auth(adminToken))
      .send({
        projectId,
        client: 'PT Klien Duplikat',
        items: [
          { clientInvoiceId: 'cinv-sama', amount: 80 },
          { clientInvoiceId: 'cinv-sama', amount: 80 },
        ],
      });

    expect(collection.status).toBe(400);
  });

  it('T17: dua payment DRAFT invoice sama -> satu approve menang, satu EXCEED_AP_OPEN', async () => {
    // Siapkan rantai PO → GR → vendor invoice POSTED dengan total 100.
    const budget = await setBudgetItem(app, adminToken, projectApAr, wbsApAr, 1_000_000);
    expect(budget.status).toBe(201);
    expect((await publishBudget(app, adminToken, projectApAr)).status).toBe(201);

    const pr = await request(app.getHttpServer()).post('/api/v1/purchase-requisitions')
      .set('Authorization', auth(buyerToken))
      .send({ projectId: projectApAr, wbsItemId: wbsApAr, requestedBy: 'ap-approval-test',
        items: [{ description: 'ap material', quantity: 1, unit: 'EA', estimatedUnitPrice: 100 }] });
    expect(pr.status).toBe(201);
    const submitted = await request(app.getHttpServer()).post('/api/v1/approvals/submit')
      .set('Authorization', auth(buyerToken))
      .send({ transactionType: 'PurchaseRequisition', transactionId: pr.body.id, approverRoleCode: 'PROCUREMENT_MANAGER' });
    expect(submitted.status).toBe(201);
    expect((await request(app.getHttpServer()).post('/api/v1/approvals/decide')
      .set('Authorization', auth(adminToken)).send({ taskId: submitted.body.id, decision: 'APPROVE' })).status).toBe(201);

    const po = await request(app.getHttpServer()).post('/api/v1/purchase-orders')
      .set('Authorization', auth(adminToken)).send({ requisitionId: pr.body.id, vendor: 'Vendor AP' });
    expect(po.status).toBe(201);
    const poApproval = await request(app.getHttpServer()).post('/api/v1/approvals/submit')
      .set('Authorization', auth(buyerToken))
      .send({ transactionType: 'PurchaseOrder', transactionId: po.body.id, approverRoleCode: 'PROCUREMENT_MANAGER' });
    expect(poApproval.status).toBe(201);
    expect((await request(app.getHttpServer()).post('/api/v1/approvals/decide')
      .set('Authorization', auth(adminToken)).send({ taskId: poApproval.body.id, decision: 'APPROVE' })).status).toBe(201);
    expect((await request(app.getHttpServer()).post(`/api/v1/purchase-orders/${po.body.id}/release`)
      .set('Authorization', auth(adminToken))).status).toBe(201);

    const gr = await request(app.getHttpServer()).post('/api/v1/goods-receipts')
      .set('Authorization', auth(adminToken))
      .send({ poId: po.body.id, warehouseId: warehouseApAr,
        items: [{ poItemId: po.body.items[0].id, quantity: 1, wbsItemId: wbsApAr }] });
    expect(gr.status).toBe(201);

    const invoice = await request(app.getHttpServer()).post('/api/v1/vendor-invoices')
      .set('Authorization', auth(adminToken))
      .send({ poId: po.body.id, vendorInvoiceNo: 'INVOICE-AP-APPROVAL',
        items: [{ poItemId: po.body.items[0].id, quantity: 1, unitPrice: 100 }] });
    expect(invoice.status).toBe(201);
    expect(invoice.body.totalAmount).toBe(100);

    const postInvoice = await request(app.getHttpServer())
      .post(`/api/v1/vendor-invoices/${invoice.body.id}/post`)
      .set('Authorization', auth(adminToken));
    expect(postInvoice.status).toBe(201);
    expect(postInvoice.body.status).toBe('POSTED');

    // Dua payment DRAFT masing-masing 80 pada invoice open 100. Keduanya BOLEH dibuat:
    // sesuai D1, DRAFT belum mengikat saldo — jadi penjaga create tidak menolaknya.
    const makePayment = (reference: string) =>
      request(app.getHttpServer()).post('/api/v1/payments')
        .set('Authorization', auth(adminToken))
        .send({ projectId: projectApAr, vendor: 'Vendor AP', reference,
          items: [{ invoiceId: invoice.body.id, amount: 80 }] });

    const [payA, payB] = await Promise.all([makePayment('AP-A'), makePayment('AP-B')]);
    expect(statuses([payA, payB])).toEqual([201, 201]);

    // Approve paralel: hanya satu boleh mengikat 80 dari sisa 100.
    const approve = (paymentId: string) =>
      request(app.getHttpServer()).post(`/api/v1/payments/${paymentId}/approve`)
        .set('Authorization', auth(adminToken));

    const [apprA, apprB] = await Promise.all([approve(payA.body.id), approve(payB.body.id)]);
    expect(statuses([apprA, apprB])).toEqual([201, 409]);

    const failed = apprA.status === 409 ? apprA : apprB;
    expect(failed.body.error.code).toBe('EXCEED_AP_OPEN');

    // Bukti: total alokasi APPROVED tidak melebihi nilai invoice.
    const approved = await app.get(PrismaService).payment.findMany({
      where: { items: { some: { invoiceId: invoice.body.id } }, status: 'APPROVED' },
      include: { items: true },
    });
    const committed = approved.reduce((sum, p) => sum + p.items.reduce((s, i) => s + Number(i.amount), 0), 0);
    expect(committed).toBeLessThanOrEqual(100);
  });

  it('T18: dua collection DRAFT invoice sama -> satu posting menang, satu EXCEED_AR_OPEN', async () => {
    // Siapkan claim CERTIFIED -> client invoice POSTED dengan total 100.
    const claim = await request(app.getHttpServer()).post('/api/v1/progress-claims')
      .set('Authorization', auth(adminToken))
      .send({ projectId: projectApAr, amount: 100, claimType: 'PROGRESS', description: 'AR reservation test' });
    expect(claim.status).toBe(201);

    const certified = await request(app.getHttpServer())
      .post(`/api/v1/progress-claims/${claim.body.id}/certify`)
      .set('Authorization', auth(adminToken))
      .send({ certifiedAmount: 100, retentionRate: 0 });
    expect(certified.status).toBe(201);
    expect(certified.body.status).toBe('CERTIFIED');

    const clientInvoice = await request(app.getHttpServer()).post('/api/v1/client-invoices')
      .set('Authorization', auth(adminToken))
      .send({ claimId: claim.body.id });
    expect(clientInvoice.status).toBe(201);
    expect(clientInvoice.body.totalAmount).toBe(100);

    const postClientInvoice = await request(app.getHttpServer())
      .post(`/api/v1/client-invoices/${clientInvoice.body.id}/post`)
      .set('Authorization', auth(adminToken));
    expect(postClientInvoice.status).toBe(201);
    expect(postClientInvoice.body.status).toBe('POSTED');

    // Dua collection DRAFT masing-masing 80. Sesuai D1, DRAFT belum mengikat AR,
    // sehingga keduanya lolos pemeriksaan awal saat create.
    const makeCollection = (reference: string) =>
      request(app.getHttpServer()).post('/api/v1/collections')
        .set('Authorization', auth(adminToken))
        .send({ projectId: projectApAr, client: 'Klien AP AR', reference,
          items: [{ clientInvoiceId: clientInvoice.body.id, amount: 80 }] });

    const [colA, colB] = await Promise.all([makeCollection('AR-A'), makeCollection('AR-B')]);
    expect(statuses([colA, colB])).toEqual([201, 201]);

    const post = (collectionId: string) =>
      request(app.getHttpServer()).post(`/api/v1/collections/${collectionId}/post`)
        .set('Authorization', auth(adminToken));

    const [postA, postB] = await Promise.all([post(colA.body.id), post(colB.body.id)]);
    expect(statuses([postA, postB])).toEqual([201, 409]);

    const failed = postA.status === 409 ? postA : postB;
    expect(failed.body.error.code).toBe('EXCEED_AR_OPEN');

    // Bukti: hanya satu collection POSTED dan hanya satu jurnal COLLECTION untuk yang menang.
    const won = postA.status === 201 ? colA.body.id : colB.body.id;
    const prisma = app.get(PrismaService);
    expect(await prisma.journal.count({ where: { source: 'COLLECTION', sourceId: won } })).toBe(1);
    const postedCollections = await prisma.collection.findMany({
      where: { items: { some: { clientInvoiceId: clientInvoice.body.id } }, status: 'POSTED' },
      include: { items: true },
    });
    const committed = postedCollections.reduce((sum, c) => sum + c.items.reduce((s, i) => s + Number(i.amount), 0), 0);
    expect(committed).toBeLessThanOrEqual(100);
  });

  it('T19: posting jurnal ke periode LOCKED ditolak 409 PERIOD_LOCKED, periode terbuka tetap menerima', async () => {
    const prisma = app.get(PrismaService);

    // Akun untuk jurnal manual (debit kas, credit pendapatan) diambil langsung dari fixture.
    const accounts = await prisma.chartOfAccount.findMany({
      where: { legalEntityId, isActive: true },
      select: { id: true, code: true },
    });
    const debitAccountId = accounts.find((a) => a.code.startsWith('1100'))?.id;
    const creditAccountId = accounts.find((a) => a.code.startsWith('4100'))?.id;
    expect(debitAccountId).toBeDefined();
    expect(creditAccountId).toBeDefined();

    // Periode LAMPAU (2026-08) sengaja dipakai supaya kunci tidak mengganggu auto-posting lain
    // yang memakai tanggal hari ini (September 2026).
    const LOCKED_PERIOD = '2026-08';

    const start = await request(app.getHttpServer()).post('/api/v1/period-closes')
      .set('Authorization', auth(adminToken))
      .send({ legalEntityId, period: LOCKED_PERIOD });
    expect(start.status).toBe(201);
    const periodCloseId = start.body.id as string;

    for (const step of ['cutoff', 'accrual', 'depreciation', 'revaluation', 'reconciliation', 'closing']) {
      const res = await request(app.getHttpServer()).post(`/api/v1/period-closes/${periodCloseId}/step`)
        .set('Authorization', auth(adminToken)).send({ step });
      expect(res.status).toBe(201);
    }
    expect((await request(app.getHttpServer()).post(`/api/v1/period-closes/${periodCloseId}/close`)
      .set('Authorization', auth(adminToken))).status).toBe(201);
    expect((await request(app.getHttpServer()).post(`/api/v1/period-closes/${periodCloseId}/lock`)
      .set('Authorization', auth(adminToken))).status).toBe(201);

    const manualJournal = (date: string, description: string) =>
      request(app.getHttpServer()).post('/api/v1/journals')
        .set('Authorization', auth(adminToken))
        .send({
          legalEntityId,
          date,
          description,
          lines: [
            { accountId: debitAccountId, debit: 100, credit: 0 },
            { accountId: creditAccountId, debit: 0, credit: 100 },
          ],
        });

    // Posting bertanggal di periode terkunci -> ditolak, tanpa jurnal tersimpan.
    const before = await prisma.journal.count({ where: { legalEntityId, source: 'MANUAL' } });
    const locked = await manualJournal(`${LOCKED_PERIOD}-15`, 'harus ditolak (periode terkunci)');
    expect(locked.status).toBe(409);
    expect(locked.body.error.code).toBe('PERIOD_LOCKED');
    expect(await prisma.journal.count({ where: { legalEntityId, source: 'MANUAL' } })).toBe(before);

    // Kontrol positif: periode terbuka (bulan berjalan) tetap menerima jurnal.
    const open = await manualJournal('2026-09-15', 'periode terbuka');
    expect(open.status).toBe(201);
  });

  it('T20: sertifikasi claim atomik — claim sama tidak dua kali, recovery DP tidak melebihi', async () => {
    const prisma = app.get(PrismaService);

    // Project khusus dengan DP: 100 uang muka, recovery 100% dari netCertified.
    const claimProject = await createProject(app, adminToken, legalEntityId, 'PRJ-E2E-CLAIM');
    await prisma.project.update({
      where: { id: claimProject },
      data: { advanceAmount: 100, advanceRecoveryRate: 100 },
    });

    const makeClaim = (description: string) =>
      request(app.getHttpServer()).post('/api/v1/progress-claims')
        .set('Authorization', auth(adminToken))
        .send({ projectId: claimProject, amount: 100, claimType: 'PROGRESS', description });

    const certify = (claimId: string, certifiedAmount = 100) =>
      request(app.getHttpServer()).post(`/api/v1/progress-claims/${claimId}/certify`)
        .set('Authorization', auth(adminToken))
        .send({ certifiedAmount, retentionRate: 0 });

    // (a) Batas recovery: claim A menyerap seluruh DP; claim B mendapat recovery 0.
    const a = await makeClaim('claim-dp-A');
    const b = await makeClaim('claim-dp-B');
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);

    const rA = await certify(a.body.id);
    expect(rA.status).toBe(201);
    expect(Number(rA.body.recoveryAmount)).toBe(100);

    const rB = await certify(b.body.id);
    expect(rB.status).toBe(201);
    expect(Number(rB.body.recoveryAmount ?? 0)).toBe(0);
    expect(Number(rB.body.cumulativeRecovered)).toBe(100);

    // Invariant: total recovery seluruh claim CERTIFIED project ini tidak melebihi DP.
    const certified = await prisma.progressClaim.findMany({
      where: { projectId: claimProject, status: 'CERTIFIED' },
      select: { recoveryAmount: true },
    });
    const totalRecovery = certified.reduce((s, c) => s + Number(c.recoveryAmount ?? 0), 0);
    expect(totalRecovery).toBeLessThanOrEqual(100);

    // (b) Dua sertifikasi PARALEL untuk claim yang SAMA -> tepat satu menang.
    const same = await makeClaim('claim-sama');
    expect(same.status).toBe(201);
    const [c1, c2] = await Promise.all([certify(same.body.id), certify(same.body.id)]);
    expect(statuses([c1, c2])).toEqual([201, 409]);
    expect((c1.status === 409 ? c1 : c2).body.error.code).toBe('NOT_DRAFT');
  });

  /** Buat + publish definisi PurchaseOrder 2 step tanpa kondisi (keduanya selalu berlaku). */
  const publishTwoStepPoWorkflow = async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/approvals/workflows')
      .set('Authorization', auth(adminToken))
      .send({ code: 'PO_MULTISTEP_E2E', name: 'PO Multi-step E2E', transactionType: 'PurchaseOrder' });
    expect(created.status).toBe(201);
    const definitionId = created.body.id as string;

    for (const [stepOrder, approverRoleCode] of [[1, 'PROCUREMENT_MANAGER'], [2, 'SUPER_ADMIN']] as const) {
      const step = await request(app.getHttpServer())
        .post(`/api/v1/approvals/workflows/${definitionId}/steps`)
        .set('Authorization', auth(adminToken))
        .send({ stepOrder, name: `Step ${stepOrder}`, approverRoleCode });
      expect(step.status).toBe(201);
    }

    const published = await request(app.getHttpServer())
      .post(`/api/v1/approvals/workflows/${definitionId}/publish`)
      .set('Authorization', auth(adminToken))
      .send({ newVersionName: 'PO Multi-step E2E v1' });
    expect(published.status).toBe(201);
    expect(published.body.status).toBe('ACTIVE');
    return definitionId;
  };

  /** PR yang sudah APPROVED (alur 1-step biasa) supaya bisa dibuatkan PO. */
  const approvedRequisition = async (wbsItemId: string, description: string) => {
    const pr = await request(app.getHttpServer())
      .post('/api/v1/purchase-requisitions')
      .set('Authorization', auth(buyerToken))
      .send({ projectId, wbsItemId, requestedBy: 'e2e-multistep', items: [{ description, quantity: 1, unit: 'EA', estimatedUnitPrice: 1_000 }] });
    expect(pr.status).toBe(201);

    const submit = await request(app.getHttpServer())
      .post('/api/v1/approvals/submit')
      .set('Authorization', auth(buyerToken))
      .send({ transactionType: 'PurchaseRequisition', transactionId: pr.body.id, approverRoleCode: 'PROCUREMENT_MANAGER' });
    expect(submit.status).toBe(201);
    expect(submit.body.totalSteps).toBe(1);

    const decided = await request(app.getHttpServer())
      .post('/api/v1/approvals/decide')
      .set('Authorization', auth(adminToken)).send({ taskId: submit.body.id, decision: 'APPROVE' });
    expect(decided.status).toBe(201);
    return pr.body.id as string;
  };

  it('T21: alur approval 2 step — APPROVED hanya setelah step kedua, task step 2 baru ada setelah step 1', async () => {
    const prisma = app.get(PrismaService);
    const wbsMultistep = await createWbs(app, adminToken, projectId, '8', 'Concurrency Multistep');
    expect((await setBudgetItem(app, adminToken, projectId, wbsMultistep, 100_000_000)).status).toBe(201);
    expect((await publishBudget(app, adminToken, projectId)).status).toBe(201);

    await publishTwoStepPoWorkflow();

    const prId = await approvedRequisition(wbsMultistep, 'multistep po');
    const po = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', auth(adminToken))
      .send({ requisitionId: prId, vendor: 'Vendor Multistep' });
    expect(po.status).toBe(201);
    const poId = po.body.id as string;

    // Submit: stepPlan berisi 2 step; hanya step 1 yang dibuat.
    const submit = await request(app.getHttpServer())
      .post('/api/v1/approvals/submit')
      .set('Authorization', auth(buyerToken))
      .send({ transactionType: 'PurchaseOrder', transactionId: poId, approverRoleCode: 'PROCUREMENT_MANAGER' });
    expect(submit.status).toBe(201);
    expect(submit.body.totalSteps).toBe(2);
    expect(submit.body.currentStepOrder).toBe(1);
    expect(submit.body.status).toBe('PENDING');

    const afterSubmit = await prisma.approvalTask.count({ where: { transactionType: 'PurchaseOrder', transactionId: poId } });
    expect(afterSubmit).toBe(1);

    // Step 1 APPROVED -> step 2 dibuat, transaksi BELUM APPROVED.
    const step1 = await request(app.getHttpServer())
      .post('/api/v1/approvals/decide')
      .set('Authorization', auth(adminToken)).send({ taskId: submit.body.id, decision: 'APPROVE' });
    expect(step1.status).toBe(201);
    expect(step1.body.stepOrder).toBe(1);
    expect(step1.body.nextTaskId).toBeTruthy();

    const midway = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
    expect(midway.status).toBe('SUBMITTED'); // inti multi-step: belum APPROVED

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/approvals/instances/PurchaseOrder/${poId}`)
      .set('Authorization', auth(adminToken));
    expect(detail.status).toBe(200);
    expect(detail.body.instance.status).toBe('PENDING');
    expect(detail.body.steps.map((s: { status: string }) => s.status)).toEqual(['APPROVED', 'PENDING']);
    expect(detail.body.activeTaskId).toBe(step1.body.nextTaskId);

    // PO belum boleh di-release sebelum step terakhir.
    expect((await request(app.getHttpServer()).post(`/api/v1/purchase-orders/${poId}/release`)
      .set('Authorization', auth(adminToken))).status).toBe(409);

    // Step 2 APPROVED -> final.
    const step2 = await request(app.getHttpServer())
      .post('/api/v1/approvals/decide')
      .set('Authorization', auth(adminToken)).send({ taskId: step1.body.nextTaskId, decision: 'APPROVE' });
    expect(step2.status).toBe(201);
    expect(step2.body.stepOrder).toBe(2);
    expect(step2.body.nextTaskId).toBeNull();

    const finalPo = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
    expect(finalPo.status).toBe('APPROVED');
    const instance = await prisma.approvalInstance.findUniqueOrThrow({
      where: { transactionType_transactionId: { transactionType: 'PurchaseOrder', transactionId: poId } },
    });
    expect(instance.status).toBe('APPROVED');
    expect(instance.completedAt).not.toBeNull();
  });

  it('T22: reject di step pertama menghentikan alur — step kedua tidak pernah dibuat', async () => {
    const prisma = app.get(PrismaService);

    // PO_MULTISTEP_E2E masih ACTIVE dari T21 (publish meng-archive PO_APPROVAL, bukan sebaliknya).
    const prId = await approvedRequisition(wbsApproval, 'multistep reject');
    const po = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', auth(adminToken))
      .send({ requisitionId: prId, vendor: 'Vendor Reject' });
    expect(po.status).toBe(201);
    const poId = po.body.id as string;

    const submit = await request(app.getHttpServer())
      .post('/api/v1/approvals/submit')
      .set('Authorization', auth(buyerToken))
      .send({ transactionType: 'PurchaseOrder', transactionId: poId, approverRoleCode: 'PROCUREMENT_MANAGER' });
    expect(submit.status).toBe(201);
    expect(submit.body.totalSteps).toBe(2);

    const reject = await request(app.getHttpServer())
      .post('/api/v1/approvals/decide')
      .set('Authorization', auth(adminToken))
      .send({ taskId: submit.body.id, decision: 'REJECT', comment: 'harga terlalu tinggi' });
    expect(reject.status).toBe(201);
    expect(reject.body.status).toBe('REJECTED');
    expect(reject.body.nextTaskId).toBeNull();

    // Alur berhenti: tidak ada task step 2, instance + transaksi final REJECTED.
    const tasks = await prisma.approvalTask.findMany({
      where: { transactionType: 'PurchaseOrder', transactionId: poId },
      orderBy: { stepOrder: 'asc' },
    });
    expect(tasks.map((t) => t.stepOrder)).toEqual([1]);
    expect(tasks[0]!.status).toBe('REJECTED');

    const instance = await prisma.approvalInstance.findUniqueOrThrow({
      where: { transactionType_transactionId: { transactionType: 'PurchaseOrder', transactionId: poId } },
    });
    expect(instance.status).toBe('REJECTED');
    expect(instance.completedAt).not.toBeNull();

    const finalPo = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
    expect(finalPo.status).toBe('REJECTED');

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/approvals/instances/PurchaseOrder/${poId}`)
      .set('Authorization', auth(adminToken));
    expect(detail.body.activeTaskId).toBeNull();
    // Step 2 tetap terlihat di plan, tetapi tidak pernah punya task.
    expect(detail.body.steps[1]).toMatchObject({ stepOrder: 2, taskId: null });
  });
});
