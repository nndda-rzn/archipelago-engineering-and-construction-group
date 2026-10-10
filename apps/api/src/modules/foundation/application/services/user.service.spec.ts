import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';

function makeService(prisma: unknown, audit: unknown = { record: jest.fn() }) {
  // `userActivity.create` dipanggil oleh hampir semua mutasi; sediakan default
  // agar mock tak perlu mengulanginya di tiap test.
  const p = prisma as { userActivity?: { create: jest.Mock } };
  if (!p.userActivity) p.userActivity = { create: jest.fn().mockResolvedValue({}) };
  return new UserService(prisma as never, audit as never);
}

const baseUser = {
  id: 'u1', username: 'buyer', email: 'buyer@aec.local', displayName: 'Buyer Demo',
  status: 'ACTIVE', lastLoginAt: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  jobTitle: 'Procurement Officer', department: 'Procurement', phone: null, managerId: null,
  legalEntityId: 'le1', organizationId: null, blockedAt: null, blockedReason: null,
  passwordChangedAt: null, failedLoginCount: 0, lastFailedLoginAt: null,
  legalEntity: { code: 'AEC-CON', legalName: 'PT AEC Construction' },
  organization: null,
  userRoles: [{ role: { code: 'BUYER', name: 'Buyer', status: 'ACTIVE' }, effectiveFrom: new Date('2026-01-01'), effectiveTo: null }],
};

describe('UserService.findAll', () => {
  it('enriches each user with roles, entity, job title and active session count', async () => {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([baseUser]),
        count: jest.fn().mockResolvedValue(1),
      },
      userSession: { groupBy: jest.fn().mockResolvedValue([{ userId: 'u1', _count: { _all: 2 } }]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;

    const out = await makeService(prisma).findAll({});

    expect(out.total).toBe(1);
    const u = out.items[0]!;
    expect(u.roles).toEqual(['BUYER']);
    expect(u.jobTitle).toBe('Procurement Officer');
    expect(u.legalEntityCode).toBe('AEC-CON');
    expect(u.activeSessions).toBe(2);
  });

  it('filters by role code and by "no role"', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      user: { findMany, count: jest.fn().mockResolvedValue(0) },
      userSession: { groupBy: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;

    await makeService(prisma).findAll({ roleCode: 'BUYER' });
    expect(findMany.mock.calls[0]![0].where.userRoles).toMatchObject({ some: { role: { code: 'BUYER' } } });

    await makeService(prisma).findAll({ noRole: 'true' });
    expect(findMany.mock.calls[1]![0].where.userRoles).toEqual({ none: {} });
  });
});

describe('UserService.stats', () => {
  it('returns totals, blocked, no-role and per-role counts', async () => {
    const prisma = {
      user: { count: jest.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(8).mockResolvedValueOnce(1).mockResolvedValueOnce(2) },
      userRole: { findMany: jest.fn().mockResolvedValue([{ roleId: 'r1' }, { roleId: 'r1' }, { roleId: 'r1' }]) },
      role: { findMany: jest.fn().mockResolvedValue([{ id: 'r1', code: 'BUYER', name: 'Buyer' }]) },
      userSession: { count: jest.fn().mockResolvedValue(4) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;

    const out = await makeService(prisma).stats();

    expect(out.total).toBe(10);
    expect(out.active).toBe(8);
    expect(out.blocked).toBe(1);
    expect(out.noRole).toBe(2);
    expect(out.activeSessions).toBe(4);
    expect(out.byRole[0]).toMatchObject({ code: 'BUYER', count: 3 });
  });
});

describe('UserService.findOne', () => {
  it('returns identity + roles + permissions + sessions + recent logins', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ ...baseUser, employee: null }) },
      userSession: { findMany: jest.fn().mockResolvedValue([{ id: 's1', status: 'ACTIVE' }]) },
      loginEvent: { findMany: jest.fn().mockResolvedValue([{ id: 'l1', type: 'SUCCESS' }]) },
      userActivity: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;
    // permissions datang dari rolePermission lewat prisma.rolePermission.
    (prisma as Record<string, unknown>).rolePermission = {
      findMany: jest.fn().mockResolvedValue([
        { permission: { code: 'User.VIEW', resource: 'User', action: 'VIEW' } },
        { permission: { code: 'User.CREATE', resource: 'User', action: 'CREATE' } },
      ]),
    };

    const out = await makeService(prisma).findOne('u1');

    expect(out.user.displayName).toBe('Buyer Demo');
    expect(out.roles[0]).toMatchObject({ code: 'BUYER' });
    expect(out.permissions.map((p) => p.code)).toContain('User.VIEW');
    expect(out.sessions).toHaveLength(1);
    expect(out.recentLogins).toHaveLength(1);
  });

  it('throws NotFound for a missing user', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } } as never;
    await expect(makeService(prisma).findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UserService.update', () => {
  it('updates only provided fields and audits', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'u1', displayName: 'New' });
    const audit = { record: jest.fn() };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser), update },
    } as never;

    await makeService(prisma, audit).update('u1', { displayName: 'New' }, 'actor');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' }, data: expect.objectContaining({ displayName: 'New' }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER.UPDATE' }));
  });
});

describe('UserService.setStatus', () => {
  it('blocks a user, records blockedAt/reason and revokes sessions', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'u1', status: 'BLOCKED' });
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const audit = { record: jest.fn() };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser), update },
      userSession: { updateMany },
    } as never;

    await makeService(prisma, audit).setStatus('u1', { status: 'BLOCKED', reason: 'left company' }, 'actor');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'BLOCKED', blockedReason: 'left company' }) }));
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 'u1', status: 'ACTIVE' }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER.STATUS' }));
  });

  it('clears blocked fields when re-activating', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'u1', status: 'ACTIVE' });
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ ...baseUser, status: 'BLOCKED' }), update },
      userSession: { updateMany: jest.fn() },
    } as never;

    await makeService(prisma).setStatus('u1', { status: 'ACTIVE' }, 'actor');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE', blockedAt: null, blockedReason: null }) }));
  });
});

describe('UserService.assignRole / revokeRole', () => {
  it('assigns a role idempotently and audits', async () => {
    const create = jest.fn().mockResolvedValue({});
    const audit = { record: jest.fn() };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser) },
      role: { findUnique: jest.fn().mockResolvedValue({ id: 'r1', code: 'BUYER', name: 'Buyer' }) },
      userRole: { findFirst: jest.fn().mockResolvedValue(null), create },
    } as never;

    await makeService(prisma, audit).assignRole('u1', { roleCode: 'BUYER' }, 'actor');

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'u1', roleId: 'r1', assignedById: 'actor' }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER.ROLE_ASSIGN' }));
  });

  it('rejects assigning a role that is already active', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser) },
      role: { findUnique: jest.fn().mockResolvedValue({ id: 'r1', code: 'BUYER' }) },
      userRole: { findFirst: jest.fn().mockResolvedValue({ userId: 'u1', roleId: 'r1' }) },
    } as never;

    await expect(makeService(prisma).assignRole('u1', { roleCode: 'BUYER' }, 'actor')).rejects.toBeInstanceOf(ConflictException);
  });

  it('revokes a role by setting effectiveTo', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const audit = { record: jest.fn() };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser) },
      role: { findUnique: jest.fn().mockResolvedValue({ id: 'r1', code: 'BUYER' }) },
      userRole: { updateMany },
    } as never;

    await makeService(prisma, audit).revokeRole('u1', 'BUYER', 'actor');

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 'u1', roleId: 'r1', effectiveTo: null }), data: expect.objectContaining({ effectiveTo: expect.any(Date) }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER.ROLE_REVOKE' }));
  });
});
