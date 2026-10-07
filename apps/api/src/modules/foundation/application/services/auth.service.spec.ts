import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Mock prisma minimal: hanya model yang dipakai AuthService. Tipe sengaja longgar
 * karena tiap test mengganti sebagian model dengan objek lebih kecil.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock test: tiap model diganti sebagian
function makePrisma(overrides: Record<string, unknown> = {}): any {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    userRole: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(undefined)),
    ...overrides,
  };
}

function makeService(prisma: unknown) {
  return new AuthService(prisma as never, { signAsync: jest.fn().mockResolvedValue('token') } as never, { record: jest.fn() } as never);
}

const activeUser = {
  id: 'u1', email: 'buyer@aec.local', username: 'buyer', displayName: 'Buyer Demo',
  passwordHash: '$2b$12$hash', status: 'ACTIVE', legalEntityId: 'le1',
  userRoles: [{ role: { code: 'BUYER', status: 'ACTIVE' } }],
};

describe('AuthService.me - permissions', () => {
  it('returns the active permission codes held by the user', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique = jest.fn().mockResolvedValue(activeUser);
    prisma.userRole.findMany = jest.fn().mockResolvedValue([
      { role: { permissions: [{ permission: { code: 'Project.VIEW' } }, { permission: { code: 'Approval.VIEW' } }] } },
    ]);

    const res = await makeService(prisma).me('u1');
    expect(res.roles).toEqual(['BUYER']);
    expect(res.permissions).toEqual(['Approval.VIEW', 'Project.VIEW']);
  });

  it('deduplicates a permission granted by two roles', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique = jest.fn().mockResolvedValue(activeUser);
    prisma.userRole.findMany = jest.fn().mockResolvedValue([
      { role: { permissions: [{ permission: { code: 'Project.VIEW' } }] } },
      { role: { permissions: [{ permission: { code: 'Project.VIEW' } }, { permission: { code: 'WBS.VIEW' } }] } },
    ]);

    const res = await makeService(prisma).me('u1');
    expect(res.permissions).toEqual(['Project.VIEW', 'WBS.VIEW']);
  });

  it('ignores expired assignments when listing permissions', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique = jest.fn().mockResolvedValue(activeUser);
    const findMany = jest.fn().mockResolvedValue([]);
    prisma.userRole.findMany = findMany;

    await makeService(prisma).me('u1');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'u1', OR: [{ effectiveTo: null }, { effectiveTo: { gt: expect.any(Date) } }] }),
      }),
    );
  });

  it('still rejects an inactive user', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique = jest.fn().mockResolvedValue({ ...activeUser, status: 'BLOCKED' });
    await expect(makeService(prisma).me('u1')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
