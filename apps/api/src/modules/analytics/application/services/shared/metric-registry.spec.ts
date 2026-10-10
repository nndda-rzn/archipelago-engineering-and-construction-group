import { BadRequestException } from '@nestjs/common';
import { METRICS, isMetricKey, isDimensionKey, resolveRows } from './metric-registry';

describe('metric-registry', () => {
  it('declares allowed dimensions per metric', () => {
    expect(METRICS.budget.allowedDimensions).toEqual(['entity', 'project', 'costType']);
    expect(METRICS.cashIn.allowedDimensions).toEqual(['entity', 'project', 'client']);
    expect(METRICS.netCash.unit).toBe('idr');
  });

  it('rejects an unsupported metric × dimension pair with UNSUPPORTED_DECOMPOSITION', async () => {
    const prisma = {} as never;
    const err = await resolveRows('cashIn', 'costType', prisma, {}).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).toEqual(
      expect.objectContaining({ code: 'UNSUPPORTED_DECOMPOSITION' }),
    );
  });

  it('guards metric/dimension strings', () => {
    expect(isMetricKey('cashIn')).toBe(true);
    expect(isMetricKey('nope')).toBe(false);
    expect(isDimensionKey('project')).toBe(true);
    expect(isDimensionKey('nope')).toBe(false);
  });

  it('netCash returns signed rows: collections positive, payments negative', async () => {
    const prisma = {
      collection: { findMany: async () => [{ projectId: 'p1', client: 'Acme', collectedAt: new Date('2026-01-10'), totalAmount: 100 }] },
      payment: { findMany: async () => [{ projectId: 'p1', vendor: 'V', paymentDate: new Date('2026-01-12'), totalAmount: 40 }] },
      project: { findMany: async () => [{ id: 'p1', code: 'P1', name: 'One', legalEntityId: 'LE1', legalEntity: { code: 'LE1', name: 'Ent' } }] },
    } as never;
    const rows = await resolveRows('netCash', 'project', prisma, {});
    expect(rows.map((r) => r.value).sort((a, b) => a - b)).toEqual([-40, 100]);
  });
});
