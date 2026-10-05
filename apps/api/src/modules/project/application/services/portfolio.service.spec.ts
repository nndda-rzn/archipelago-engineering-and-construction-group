import { PortfolioService } from './portfolio.service';

describe('PortfolioService.portfolio filter', () => {
  it('scopes project query by legalEntityId when provided', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { project: { findMany } } as never;
    const actualCost = { computeBatch: jest.fn() } as never;

    const svc = new PortfolioService(prisma, actualCost);
    await svc.portfolio({ legalEntityId: 'LE1' });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { legalEntityId: 'LE1' } }));
  });

  it('omits where when no filter', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { project: { findMany } } as never;

    const svc = new PortfolioService(prisma, { computeBatch: jest.fn() } as never);
    await svc.portfolio();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
});
