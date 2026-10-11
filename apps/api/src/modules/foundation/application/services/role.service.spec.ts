import { ConflictException, NotFoundException } from '@nestjs/common';
import { RoleService } from './role.service';

function makeService(prisma: unknown, audit: unknown = { record: jest.fn() }) {
  const p = prisma as { roleActivity?: { create: jest.Mock } };
  if (!p.roleActivity) p.roleActivity = { create: jest.fn().mockResolvedValue({}) };
  return new RoleService(prisma as never, audit as never);
}

const baseRole = {
  id: 'r1', code: 'BUYER', name: 'Buyer', description: 'Membuat PR',
  status: 'ACTIVE', category: 'FUNCTIONAL', isSystem: false, isAssignable: true,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  permissions: [
    { permission: { code: 'Project.VIEW', resource: 'Project', action: 'VIEW', group: 'PROJECT', isSensitive: false } },
    { permission: { code: 'PurchaseOrder.CREATE', resource: 'PurchaseOrder', action: 'CREATE', group: 'PROCUREMENT', isSensitive: false } },
  ],
  userRoles: [
    { user: { id: 'u1', displayName: 'Buyer Demo', email: 'buyer@aec.local', jobTitle: 'Officer', legalEntity: { code: 'AEC-CON' } }, effectiveFrom: new Date('2026-01-01'), effectiveTo: null, assignedById: 'seed', reason: null },
  ],
  _count: { userRoles: 1 },
};

describe('RoleService.findAll', () => {
  it('enriches each role with member count and permission count', async () => {
    const prisma = { role: { findMany: jest.fn().mockResolvedValue([baseRole]) } } as never;
    const out = await makeService(prisma).findAll();
    expect(out).toHaveLength(1);
    expect(out[0]!.memberCount).toBe(1);
    expect(out[0]!.permissionCount).toBe(2);
    expect(out[0]!.category).toBe('FUNCTIONAL');
  });
});

describe('RoleService.stats', () => {
  it('returns totals plus empty and unused role counts', async () => {
    const prisma = {
      role: {
        count: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(4),
        findMany: jest.fn().mockResolvedValue([
          { id: 'r1', permissions: [{ permissionId: 'p1' }], _count: { userRoles: 2 } },
          { id: 'r2', permissions: [], _count: { userRoles: 0 } }, // empty + unused
          { id: 'r3', permissions: [{ permissionId: 'p2' }], _count: { userRoles: 0 } }, // unused
        ]),
      },
      rolePermission: { count: jest.fn().mockResolvedValue(30) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;

    const out = await makeService(prisma).stats();
    expect(out.total).toBe(5);
    expect(out.active).toBe(4);
    expect(out.emptyRoles).toBe(1);
    expect(out.unusedRoles).toBe(2);
    expect(out.assignments).toBe(30);
  });
});

describe('RoleService.findOne', () => {
  it('returns role, permissions, members and activity', async () => {
    const prisma = {
      role: { findUnique: jest.fn().mockResolvedValue(baseRole) },
      roleActivity: { findMany: jest.fn().mockResolvedValue([{ id: 'a1', action: 'ROLE.CREATE' }]) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;

    const out = await makeService(prisma).findOne('r1');
    expect(out.role.code).toBe('BUYER');
    expect(out.permissions.map((p) => p.code)).toContain('Project.VIEW');
    expect(out.members[0]!.displayName).toBe('Buyer Demo');
    expect(out.activity).toHaveLength(1);
  });

  it('throws NotFound for a missing role', async () => {
    const prisma = { role: { findUnique: jest.fn().mockResolvedValue(null) } } as never;
    await expect(makeService(prisma).findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('RoleService.assignPermissions', () => {
  it('replaces permissions and reports the added/removed diff', async () => {
    const audit = { record: jest.fn() };
    const tx = {
      rolePermission: { deleteMany: jest.fn(), createMany: jest.fn() },
    };
    const prisma = {
      role: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ ...baseRole, permissions: [{ permission: { code: 'Project.VIEW' } }] })
          .mockResolvedValueOnce({ ...baseRole, permissions: [] }),
      },
      permission: { findMany: jest.fn().mockResolvedValue([{ id: 'p2', code: 'PurchaseOrder.CREATE' }]) },
      $transaction: jest.fn((fn: (t: unknown) => unknown) => (typeof fn === 'function' ? fn(tx) : Promise.all(fn as Promise<unknown>[]))),
    } as never;

    const out = await makeService(prisma, audit).assignPermissions('r1', { permissionCodes: ['PurchaseOrder.CREATE'] }, 'actor');

    expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'r1' } });
    expect(tx.rolePermission.createMany).toHaveBeenCalled();
    expect(out.added).toContain('PurchaseOrder.CREATE');
    expect(out.removed).toContain('Project.VIEW');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'ROLE.PERMISSIONS_CHANGE' }));
  });
});

describe('RoleService.remove', () => {
  it('refuses to delete a system role', async () => {
    const prisma = { role: { findUnique: jest.fn().mockResolvedValue({ ...baseRole, isSystem: true }) } } as never;
    await expect(makeService(prisma).remove('r1', 'actor')).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses to delete a role that still has active members', async () => {
    const prisma = {
      role: { findUnique: jest.fn().mockResolvedValue({ ...baseRole, isSystem: false }) },
      userRole: { count: jest.fn().mockResolvedValue(3) },
    } as never;
    await expect(makeService(prisma).remove('r1', 'actor')).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes a custom role once it has no active members', async () => {
    const audit = { record: jest.fn() };
    const del = jest.fn().mockResolvedValue({});
    const prisma = {
      role: { findUnique: jest.fn().mockResolvedValue({ ...baseRole, isSystem: false }), delete: del },
      userRole: { count: jest.fn().mockResolvedValue(0) },
    } as never;
    const out = await makeService(prisma, audit).remove('r1', 'actor');
    expect(del).toHaveBeenCalledWith({ where: { id: 'r1' } });
    expect(out.deleted).toBe(true);
  });
});

describe('RoleService.addMember / removeMember', () => {
  it('adds a member idempotently and audits', async () => {
    const audit = { record: jest.fn() };
    const prisma = {
      role: { findUnique: jest.fn().mockResolvedValue(baseRole) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u2', displayName: 'PM', email: 'pm@aec.local' }) },
      userRole: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
    } as never;

    await makeService(prisma, audit).addMember('r1', { userId: 'u2' }, 'actor');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'ROLE.MEMBER_ADD' }));
  });

  it('rejects adding a user who already holds the role', async () => {
    const prisma = {
      role: { findUnique: jest.fn().mockResolvedValue(baseRole) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u2' }) },
      userRole: { findFirst: jest.fn().mockResolvedValue({ userId: 'u2', roleId: 'r1' }) },
    } as never;
    await expect(makeService(prisma).addMember('r1', { userId: 'u2' }, 'actor')).rejects.toBeInstanceOf(ConflictException);
  });

  it('removes a member by setting effectiveTo', async () => {
    const audit = { record: jest.fn() };
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      role: { findUnique: jest.fn().mockResolvedValue(baseRole) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u2', displayName: 'PM' }) },
      userRole: { updateMany },
    } as never;
    await makeService(prisma, audit).removeMember('r1', 'u2', 'actor');
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ effectiveTo: expect.any(Date) }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'ROLE.MEMBER_REMOVE' }));
  });
});
