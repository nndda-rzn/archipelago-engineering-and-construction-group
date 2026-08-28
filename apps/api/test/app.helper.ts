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

export async function setBudgetItem(app: INestApplication, token: string, projectId: string, wbsItemId: string, amount: number): Promise<Response> {
  return request(app.getHttpServer())
    .post(`/api/v1/projects/${projectId}/budget/items`)
    .set('Authorization', auth(token))
    .send({ wbsItemId, amount });
}

export async function publishBudget(app: INestApplication, token: string, projectId: string): Promise<Response> {
  return request(app.getHttpServer())
    .post(`/api/v1/projects/${projectId}/budget/publish`)
    .set('Authorization', auth(token))
    .send({});
}
