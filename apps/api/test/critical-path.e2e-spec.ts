import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAs, auth, getFirstProjectId, getFirstWbs, getWbsIds, setBudgetItem, publishBudget } from './app.helper';

describe('Critical path (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await loginAs(app, 'admin@aec.local', 'Admin123!');
  });

  afterAll(async () => {
    await app.close();
  });

  it('admin bisa lihat employees (RBAC allow)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/employees')
      .query({ page: 1, pageSize: 5 })
      .set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('buyer tanpa Employee.VIEW -> 403 (RBAC deny)', async () => {
    const buyerToken = await loginAs(app, 'buyer@aec.local', 'Buyer123!');
    const res = await request(app.getHttpServer())
      .get('/api/v1/employees')
      .query({ page: 1, pageSize: 5 })
      .set('Authorization', auth(buyerToken));
    expect(res.status).toBe(403);
  });

  it('PR estimasi melebihi sisa budget -> 409 BUDGET_EXCEEDED', async () => {
    const projectId = await getFirstProjectId(app, adminToken);
    const wbsItemId = await getFirstWbs(app, adminToken, projectId);

    const budgetSet = await setBudgetItem(app, adminToken, projectId, wbsItemId, 100_000_000);
    expect(budgetSet.status).toBe(201);
    const published = await publishBudget(app, adminToken, projectId);
    expect(published.status).toBe(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-requisitions')
      .set('Authorization', auth(adminToken))
      .send({
        projectId,
        wbsItemId,
        requestedBy: 'e2e-tester',
        items: [{ description: 'e2e item melebihi budget', quantity: 1, unit: 'EA', estimatedUnitPrice: 200_000_000 }],
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BUDGET_EXCEEDED');
  });

  it('PR dalam budget -> 201', async () => {
    const projectId = await getFirstProjectId(app, adminToken);
    const wbsItemId = await getFirstWbs(app, adminToken, projectId, 1);

    const budgetSet = await setBudgetItem(app, adminToken, projectId, wbsItemId, 100_000_000);
    expect(budgetSet.status).toBe(201);
    const published = await publishBudget(app, adminToken, projectId);
    expect(published.status).toBe(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-requisitions')
      .set('Authorization', auth(adminToken))
      .send({
        projectId,
        wbsItemId,
        requestedBy: 'e2e-tester',
        items: [{ description: 'e2e item normal', quantity: 1, unit: 'EA', estimatedUnitPrice: 1_000 }],
      });

    expect(res.status).toBe(201);
  });

  it('decimal roundtrip: nominal dikembalikan sebagai number (bukan string)', async () => {
    const projectId = await getFirstProjectId(app, adminToken);
    const wbsItemId = await getFirstWbs(app, adminToken, projectId, 2);

    const budgetSet = await setBudgetItem(app, adminToken, projectId, wbsItemId, 12345678.5);
    expect(budgetSet.status).toBe(201);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/budget`)
      .set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);

    const items = res.body.wbs ?? [];
    const target = items.find((w: { id: string }) => w.id === wbsItemId);
    expect(target).toBeDefined();
    expect(typeof target.budget).toBe('number');
    expect(target.budget).toBe(12345678.5);
  });
});
