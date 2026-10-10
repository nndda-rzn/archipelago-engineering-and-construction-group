import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp, loginAs } from './app.helper';

/**
 * Sesi basi: token masih valid secara kripto, tetapi `sub`-nya menunjuk user
 * yang sudah tidak ada (mis. DB di-reset sehingga cuid user berubah, atau user
 * dihapus). Endpoint ber-`@Permissions` harus membalas 401 (klien login ulang),
 * BUKAN 403 (yang terbaca sebagai "kurang izin").
 */
describe('Stale session (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeAll(async () => {
    app = await createTestApp();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  const tokenForMissingUser = () =>
    jwt.signAsync({ sub: 'user-that-does-not-exist', email: 'ghost@aec.local' });

  it('returns 401 SESSION_STALE (not 403) for a valid token whose user no longer exists', async () => {
    const token = await tokenForMissingUser();
    const res = await request(app.getHttpServer())
      .get('/api/v1/legal-entities')
      .query({ page: 1, pageSize: 20, sortDir: 'asc' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_STALE');
  });

  it('returns 401 SESSION_STALE on a second permission-guarded endpoint too', async () => {
    const token = await tokenForMissingUser();
    const res = await request(app.getHttpServer())
      .get('/api/v1/approvals/pending-count')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_STALE');
  });

  it('still returns 403 PERMISSION_DENIED when the user exists but lacks the permission', async () => {
    // BUYER tidak memegang izin User.CREATE → 403 tetap benar untuk kasus ini.
    const token = await loginAs(app, 'buyer@aec.local', 'Buyer123!');
    const deny = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'x', email: 'x@aec.local', displayName: 'X', password: 'Password123!' });
    expect(deny.status).toBe(403);
    expect(deny.body.error.code).toBe('PERMISSION_DENIED');
  });
});
