import { BudgetController } from './budget.controller';

/**
 * `publish` lama harus tetap bekerja, tetapi sekarang mendelegasikan ke freeze.
 * Test ini mengunci kontrak itu: klien web dan e2e lama tidak boleh putus.
 */
describe('BudgetController', () => {
  const make = () => {
    const service = { findAll: jest.fn(), upsert: jest.fn() };
    const baseline = { freeze: jest.fn(), openRevision: jest.fn(), findBaseline: jest.fn() };
    return { controller: new BudgetController(service as never, baseline as never), service, baseline };
  };

  it('exposes publish as an alias for freeze', async () => {
    const { controller, baseline } = make();
    baseline.freeze.mockResolvedValue({ version: 1 });

    await controller.publish('p1', { note: 'year end' }, { user: { sub: 'u1' } });

    expect(baseline.freeze).toHaveBeenCalledWith('p1', { reason: 'year end' }, 'u1');
  });

  it('falls back to system when the request has no user', async () => {
    const { controller, baseline } = make();
    baseline.freeze.mockResolvedValue({ version: 1 });

    await controller.freeze('p1', {}, {});

    expect(baseline.freeze).toHaveBeenCalledWith('p1', {}, 'system');
  });

  it('passes the revision reason through', async () => {
    const { controller, baseline } = make();
    baseline.openRevision.mockResolvedValue({ version: 2 });

    await controller.openRevision('p1', { reason: 'VO-01 steel' }, { user: { sub: 'u1' } });

    expect(baseline.openRevision).toHaveBeenCalledWith('p1', { reason: 'VO-01 steel' }, 'u1');
  });
});
