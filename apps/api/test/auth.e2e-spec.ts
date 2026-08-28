import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAs } from './app.helper';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login admin sukses -> accessToken', async () => {
    const token = await loginAs(app, 'admin@aec.local', 'Admin123!');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });

  it('password salah -> 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@aec.local', password: 'salah-salah' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /auth/me dengan token -> email admin', async () => {
    const token = await loginAs(app, 'admin@aec.local', 'Admin123!');
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@aec.local');
  });

  it('GET /auth/me tanpa token -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
