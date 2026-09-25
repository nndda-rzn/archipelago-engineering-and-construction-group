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
  let warehouseId: string;
  let wbsBudget: string; // WBS untuk test budget PR (T13) — budget di-publish di test itu.
  let wbsIssue: string; // WBS untuk test material issue (T1).
  let wbsApproval: string; // WBS untuk test approval task (T9).
  let wbsAdj: string; // WBS untuk test stock adjustment (T2).
  let wbsInvoice: string;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await loginAs(app, 'admin@aec.local', 'Admin123!');
    buyerToken = await loginAs(app, 'buyer@aec.local', 'Buyer123!');

    const legalEntityId = await getFirstLegalEntityId(app, adminToken);
    projectId = await createProject(app, adminToken, legalEntityId, 'PRJ-E2E-CONC');
    wbsBudget = await createWbs(app, adminToken, projectId, '1', 'Concurrency Budget');
    wbsIssue = await createWbs(app, adminToken, projectId, '2', 'Concurrency Issue');
    wbsApproval = await createWbs(app, adminToken, projectId, '3', 'Concurrency Approval');
    wbsAdj = await createWbs(app, adminToken, projectId, '4', 'Concurrency Adjustment');
    wbsInvoice = await createWbs(app, adminToken, projectId, '5', 'Concurrency Invoice');
    warehouseId = await createWarehouse(app, adminToken, projectId, 'WH-E2E-CONC', 'Warehouse Concurrency');
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
});
