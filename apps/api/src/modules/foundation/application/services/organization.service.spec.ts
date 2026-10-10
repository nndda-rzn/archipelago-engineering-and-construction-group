import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrganizationService } from './organization.service';

function makeService(prisma: unknown, audit = { record: jest.fn() }) {
  return new OrganizationService(prisma as never, audit as never);
}

describe('OrganizationService.updateOrganization', () => {
  it('rejects setting a parent to one of its own descendants (cycle)', async () => {
    const prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'o1', legalEntityId: 'le1', parentId: null }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'o1', parentId: null },
          { id: 'o2', parentId: 'o1' },
          { id: 'o3', parentId: 'o2' },
        ]),
      },
    } as never;
    const svc = makeService(prisma);
    const err = await svc.updateOrganization('o1', { parentId: 'o3' } as never, 'u1').catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).toEqual(expect.objectContaining({ code: 'ORG_CYCLE' }));
  });

  it('updates and records an audit entry', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'o1', legalEntityId: 'le1', parentId: null, name: 'Old', orgType: 'GROUP' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'o1', parentId: null }]),
        update: jest.fn().mockResolvedValue({ id: 'o1', name: 'New' }),
      },
    } as never;
    const svc = makeService(prisma, audit);
    await svc.updateOrganization('o1', { name: 'New' } as never, 'u1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'Organization.UPDATE' }));
  });
});

describe('OrganizationService.setStatus', () => {
  it('rejects a no-op transition with 409 INVALID_STATUS_TRANSITION', async () => {
    const prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'o1', status: 'INACTIVE' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as never;
    const svc = makeService(prisma);
    const err = await svc.setStatus('o1', 'INACTIVE', 'u1').catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).toEqual(expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }));
  });

  it('applies the transition and audits it', async () => {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'o1', status: 'ACTIVE' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as never;
    const svc = makeService(prisma, audit);
    await svc.setStatus('o1', 'INACTIVE', 'u1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'Organization.STATUS' }));
  });
});
