import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { DecimalToNumberInterceptor } from '../src/shared/interceptors/decimal-to-number.interceptor';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new DecimalToNumberInterceptor());
  await app.init();
  return app;
}

export async function loginAs(app: INestApplication, email: string, password: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password });
  if (res.status !== 201) {
    throw new Error(`login gagal (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.accessToken as string;
}

export const auth = (token: string) => `Bearer ${token}`;

/**
 * Jalankan request sambil menunggu bila kena throttle (429). ThrottlerGuard global
 * memakai burst `short` = 3 req/detik, sehingga setup fixture yang berurutan bisa
 * ditolak; di sini kita hormati `retry-after` lalu coba lagi.
 */
export async function requestWithRetry(
  run: () => request.Test,
  attempts = 5,
): Promise<Response> {
  for (let i = 1; ; i++) {
    const res = await run();
    if (res.status !== 429 || i >= attempts) return res;
    const retryAfterSec = Number(res.headers['retry-after-short'] ?? res.headers['retry-after'] ?? 1) || 1;
    await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000 + 50));
  }
}

export async function getFirstProjectId(app: INestApplication, token: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .get('/api/v1/projects')
    .query({ page: 1, pageSize: 1 })
    .set('Authorization', auth(token));
  if (res.status !== 200 || !res.body.items?.length) {
    throw new Error(`tidak ada project di seed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.items[0].id as string;
}

/**
 * Ambil id project berdasarkan kode (deterministik). Dipakai alih-alih "project pertama"
 * supaya suite tidak bergantung pada urutan `createdAt desc` saat suite lain menambah project.
 */
export async function getProjectIdByCode(app: INestApplication, token: string, code: string): Promise<string> {
  const res = await requestWithRetry(() =>
    request(app.getHttpServer())
      .get('/api/v1/projects')
      .query({ page: 1, pageSize: 200 })
      .set('Authorization', auth(token)),
  );
  if (res.status !== 200 || !res.body.items?.length) {
    throw new Error(`tidak ada project (${res.status}): ${JSON.stringify(res.body)}`);
  }
  const match = res.body.items.find((p: { code: string }) => p.code === code);
  if (!match) {
    throw new Error(`project ${code} tidak ditemukan di seed`);
  }
  return match.id as string;
}

export async function getFirstWbs(app: INestApplication, token: string, projectId: string, index = 0): Promise<string> {
  const res = await request(app.getHttpServer())
    .get(`/api/v1/projects/${projectId}/wbs`)
    .set('Authorization', auth(token));
  if (res.status !== 200 || !res.body?.length) {
    throw new Error(`tidak ada WBS di project (${res.status}): ${JSON.stringify(res.body)}`);
  }
  const item = res.body[index];
  if (!item) {
    throw new Error(`WBS index ${index} tidak ada (total ${res.body.length})`);
  }
  return item.id as string;
}

export async function getWbsIds(app: INestApplication, token: string, projectId: string): Promise<string[]> {
  const res = await request(app.getHttpServer())
    .get(`/api/v1/projects/${projectId}/wbs`)
    .set('Authorization', auth(token));
  if (res.status !== 200 || !res.body?.length) {
    throw new Error(`tidak ada WBS di project (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.map((w: { id: string }) => w.id);
}

export async function getFirstLegalEntityId(app: INestApplication, token: string): Promise<string> {
  const res = await requestWithRetry(() =>
    request(app.getHttpServer())
      .get('/api/v1/legal-entities')
      .query({ page: 1, pageSize: 1 })
      .set('Authorization', auth(token)),
  );
  if (res.status !== 200 || !res.body.items?.length) {
    throw new Error(`tidak ada legal entity di seed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.items[0].id as string;
}

export async function createProject(app: INestApplication, token: string, legalEntityId: string, code: string): Promise<string> {
  const res = await requestWithRetry(() =>
    request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', auth(token))
      .send({ code, name: `Project ${code}`, client: 'E2E Client', legalEntityId, currency: 'IDR' }),
  );
  if (res.status !== 201) {
    throw new Error(`create project gagal (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.id as string;
}

export async function createWbs(app: INestApplication, token: string, projectId: string, code: string, name: string): Promise<string> {
  const res = await requestWithRetry(() =>
    request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/wbs`)
      .set('Authorization', auth(token))
      .send({ code, name }),
  );
  if (res.status !== 201) {
    throw new Error(`create wbs gagal (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.id as string;
}

export async function createWarehouse(app: INestApplication, token: string, projectId: string, code: string, name: string): Promise<string> {
  const res = await requestWithRetry(() =>
    request(app.getHttpServer())
      .post('/api/v1/warehouses')
      .set('Authorization', auth(token))
      .send({ code, name, warehouseType: 'PROJECT', projectId }),
  );
  if (res.status !== 201) {
    throw new Error(`create warehouse gagal (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.id as string;
}

export async function setBudgetItem(app: INestApplication, token: string, projectId: string, wbsItemId: string, amount: number): Promise<Response> {
  return requestWithRetry(() =>
    request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/budget/items`)
      .set('Authorization', auth(token))
      .send({ wbsItemId, amount }),
  );
}

export async function publishBudget(app: INestApplication, token: string, projectId: string): Promise<Response> {
  return requestWithRetry(() =>
    request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/budget/publish`)
      .set('Authorization', auth(token))
      .send({}),
  );
}
