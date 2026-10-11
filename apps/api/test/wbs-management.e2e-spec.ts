import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAs, auth, getProjectIdByCode, createWbs, getWbsIds } from './app.helper';

const SEED_PROJECT_CODE = 'PRJ-EPC-2027-014';

describe('WBS management (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let projectId: string;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await loginAs(app, 'admin@aec.local', 'Admin123!');
    projectId = await getProjectIdByCode(app, adminToken, SEED_PROJECT_CODE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /wbs returns rollup + management fields on each node', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/wbs`)
      .set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const node = res.body[0];
    expect(node).toHaveProperty('rollup');
    expect(node.rollup).toHaveProperty('budget');
    expect(node).toHaveProperty('responsibleManager');
    expect(node).toHaveProperty('isMilestone');
  });

  it('PATCH /wbs/:id updates progress and owner', async () => {
    const code = `E2E-${Date.now()}`;
    const itemId = await createWbs(app, adminToken, projectId, code, 'E2E node');

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/wbs/${itemId}`)
      .set('Authorization', auth(adminToken))
      .send({ progressPercent: 55, responsibleManager: 'E2E Owner' });
    expect(res.status).toBe(200);
    expect(Number(res.body.progressPercent)).toBe(55);
    expect(res.body.responsibleManager).toBe('E2E Owner');

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/wbs/${itemId}`)
      .set('Authorization', auth(adminToken));
  });

  it('POST /wbs/:id/move rejects moving under its own descendant -> 400 WBS_CYCLE', async () => {
    const parentId = await createWbs(app, adminToken, projectId, `E2E-P-${Date.now()}`, 'Parent');
    const childRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/wbs`)
      .set('Authorization', auth(adminToken))
      .send({ code: `E2E-C-${Date.now()}`, name: 'Child', parentId });
    const childId = childRes.body.id as string;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/wbs/${parentId}/move`)
      .set('Authorization', auth(adminToken))
      .send({ parentId: childId });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WBS_CYCLE');

    await request(app.getHttpServer()).delete(`/api/v1/projects/${projectId}/wbs/${parentId}`).set('Authorization', auth(adminToken));
  });

  it('DELETE /wbs/:id refuses a node that owns a budget item -> 409 WBS_HAS_LINKS', async () => {
    const code = `E2E-B-${Date.now()}`;
    const itemId = await createWbs(app, adminToken, projectId, code, 'Budgeted node');

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/budget/items`)
      .set('Authorization', auth(adminToken))
      .send({ wbsItemId: itemId, amount: 1_000_000 });

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/wbs/${itemId}`)
      .set('Authorization', auth(adminToken));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WBS_HAS_LINKS');
  });

  it('DELETE /wbs/:id removes a node with no links', async () => {
    const itemId = await createWbs(app, adminToken, projectId, `E2E-D-${Date.now()}`, 'Deletable');
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/wbs/${itemId}`)
      .set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);

    const ids = await getWbsIds(app, adminToken, projectId);
    expect(ids).not.toContain(itemId);
  });

  it('GET /wbs/:id/links returns per-type counts', async () => {
    const code = `E2E-L-${Date.now()}`;
    const itemId = await createWbs(app, adminToken, projectId, code, 'Linked node');
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/budget/items`)
      .set('Authorization', auth(adminToken))
      .send({ wbsItemId: itemId, amount: 500_000 });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/wbs/${itemId}/links`)
      .set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.links.some((l: { key: string }) => l.key === 'budgetItems')).toBe(true);
  });

  it('buyer without WBS.EDIT -> 403 on PATCH (RBAC deny)', async () => {
    const buyerToken = await loginAs(app, 'buyer@aec.local', 'Buyer123!');
    const itemId = await createWbs(app, adminToken, projectId, `E2E-R-${Date.now()}`, 'RBAC node');
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/wbs/${itemId}`)
      .set('Authorization', auth(buyerToken))
      .send({ progressPercent: 10 });
    expect(res.status).toBe(403);
    await request(app.getHttpServer()).delete(`/api/v1/projects/${projectId}/wbs/${itemId}`).set('Authorization', auth(adminToken));
  });
});
