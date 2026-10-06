import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('/health reports the app is up', () => {
    const prisma = { $queryRaw: jest.fn() } as never;
    const controller = new HealthController(prisma);
    const res = controller.getHealth();
    expect(res.status).toBe('ok');
    expect(typeof res.timestamp).toBe('string');
  });

  it('/health/ready returns db=up when the database answers', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as never;
    const controller = new HealthController(prisma);
    const res = await controller.getReady();
    expect(res).toEqual(expect.objectContaining({ status: 'ok', db: 'up' }));
  });

  it('/health/ready fails with 503 DB_DOWN when the database is unreachable', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) } as never;
    const controller = new HealthController(prisma);
    await expect(controller.getReady()).rejects.toMatchObject({ status: 503 });
  });

  it('/health/ready does not leak connection details on failure', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED postgresql://u:secret@h:5438/db')),
    } as never;
    const controller = new HealthController(prisma);
    try {
      await controller.getReady();
      throw new Error('should have thrown');
    } catch (e) {
      const body = JSON.stringify((e as { getResponse: () => unknown }).getResponse());
      expect(body).not.toContain('secret');
      expect(body).not.toContain('5438');
    }
  });

  it('/health/ready logs the real cause so a 503 can be diagnosed', async () => {
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('relation does not exist')) } as never;
    const controller = new HealthController(prisma);
    await expect(controller.getReady()).rejects.toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('relation does not exist'),
      expect.anything(),
    );
    spy.mockRestore();
  });

  it('/health does not touch the database (liveness stays up when DB is down)', () => {
    const $queryRaw = jest.fn().mockRejectedValue(new Error('down'));
    const controller = new HealthController({ $queryRaw } as never);
    expect(controller.getHealth().status).toBe('ok');
    expect($queryRaw).not.toHaveBeenCalled();
  });

  it('declares an explicit @Inject(PrismaService) — tsx does not emit decorator metadata', () => {
    // Tanpa `@Inject` eksplisit, injeksi berbasis-tipe menjadi `undefined` saat
    // dijalankan lewat `tsx` (tanpa emitDecoratorMetadata) dan `/health/ready`
    // selalu 503. Dibaca dari SUMBER karena metadata runtime berbeda antara
    // ts-jest (punya) dan tsx (tidak) — sumbernya yang menentukan.
    const source = readFileSync(resolve(__dirname, 'health.controller.ts'), 'utf8');
    expect(source).toMatch(/@Inject\(PrismaService\)\s+private readonly prisma/);
  });
});
