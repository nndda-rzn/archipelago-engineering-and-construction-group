import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAs, auth, getFirstLegalEntityId, createProject, createWbs, getWbsIds } from './app.helper';

/**
 * Uji manajemen WBS (update, guard hapus, move, rollup, links).
 *
 * Fixture memakai PROJECT SENDIRI (bukan seed bersama) supaya suite ini tidak
 * menggeser indeks WBS seed yang dipakai `critical-path.e2e-spec.ts`
 * (`getFirstWbs(..., 1)`) — pelajaran yang sama dengan `concurrency.e2e-spec.ts`.
 */
describe('WBS management (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let projectId: string;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await loginAs(app, 'admin@aec.local', 'Admin123!');
    const entityId = await getFirstLegalEntityId(app, adminToken);
    projectId = await createProject(app, adminToken, entityId, `PRJ-WBS-${Date.now()}`);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /wbs returns rollup + management fields on each node', async () => {
    const itemId = await createWbs(app, adminToken, projectId, '1', 'Engineering');
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/wbs`)
      .set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const node = res.body.find((n: { id: string }) => n.id === itemId);
    expect(node).toHaveProperty('rollup');
    expect(node.rollup).toHaveProperty('budget');
    expect(node).toHaveProperty('responsibleManager');
    expect(node).toHaveProperty('isMilestone');
  });

  it('PATCH /wbs/:id updates progress and owner', async () => {
    const itemId = await createWbs(app, adminToken, projectId, '2', 'Procurement');
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/wbs/${itemId}`)
      .set('Authorization', auth(adminToken))
      .send({ progressPercent: 55, responsibleManager: 'E2E Owner' });
    expect(res.status).toBe(200);
    expect(Number(res.body.progressPercent)).toBe(55);
    expect(res.body.responsibleManager).toBe('E2E Owner');
  });

  it('POST /wbs/:id/move rejects moving under its own descendant -> 400 WBS_CYCLE', async () => {
    const parentId = await createWbs(app, adminToken, projectId, '3', 'Parent');
    const childRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/wbs`)
      .set('Authorization', auth(adminToken))
      .send({ code: '3.1', name: 'Child', parentId });
    const childId = childRes.body.id as string;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/wbs/${parentId}/move`)
      .set('Authorization', auth(adminToken))
      .send({ parentId: childId });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WBS_CYCLE');
  });

  it('DELETE /wbs/:id refuses a node that owns a budget item -> 409 WBS_HAS_LINKS', async () => {
    const itemId = await createWbs(app, adminToken, projectId, '4', 'Budgeted node');
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/budget/items`)
      .set('Authorization', auth(adminToken))
      .send({ wbsItemId: itemId, costType: 'LABOR', amount: 1_000_000 });

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/wbs/${itemId}`)
      .set('Authorization', auth(adminToken));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WBS_HAS_LINKS');
  });

  it('GET /wbs/:id/links returns per-type counts', async () => {
    const itemId = await createWbs(app, adminToken, projectId, '5', 'Linked node');
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/budget/items`)
      .set('Authorization', auth(adminToken))
      .send({ wbsItemId: itemId, costType: 'LABOR', amount: 500_000 });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/wbs/${itemId}/links`)
      .set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.links.some((l: { key: string }) => l.key === 'budgetItems')).toBe(true);
  });

  it('DELETE /wbs/:id removes a node with no links', async () => {
    const itemId = await createWbs(app, adminToken, projectId, '6', 'Deletable');
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/wbs/${itemId}`)
      .set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);

    const ids = await getWbsIds(app, adminToken, projectId);
    expect(ids).not.toContain(itemId);
  });

  it('buyer without WBS.EDIT -> 403 on PATCH (RBAC deny)', async () => {
    const buyerToken = await loginAs(app, 'buyer@aec.local', 'Buyer123!');
    const itemId = await createWbs(app, adminToken, projectId, '7', 'RBAC node');
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/wbs/${itemId}`)
      .set('Authorization', auth(buyerToken))
      .send({ progressPercent: 10 });
    expect(res.status).toBe(403);
  });
});
