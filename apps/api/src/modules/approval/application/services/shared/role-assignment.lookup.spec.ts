import { ConflictException } from '@nestjs/common';
import { RoleAssignmentLookup } from './role-assignment.lookup';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock test: model diganti sebagian
function makePrisma(overrides: Record<string, unknown> = {}): any {
  return {
    role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1', code: 'PROCUREMENT_MANAGER' }) },
    userRole: {
      findFirst: jest.fn().mockResolvedValue({ userId: 'approver-1' }),
      findMany: jest.fn().mockResolvedValue([{ role: { code: 'PROCUREMENT_MANAGER' } }]),
    },
    ...overrides,
  };
}

describe('RoleAssignmentLookup', () => {
  describe('activeWhere', () => {
    it('filters out expired assignments', () => {
      const where = new RoleAssignmentLookup(makePrisma() as never).activeWhere('r1');
      expect(where.roleId).toBe('r1');
      expect(where.OR).toEqual([{ effectiveTo: null }, { effectiveTo: { gt: expect.any(Date) } }]);
    });
  });

  describe('findActiveAssignment', () => {
    it('returns the first active assignment', async () => {
      const prisma = makePrisma();
      const res = await new RoleAssignmentLookup(prisma as never).findActiveAssignment('r1');
      expect(res).toEqual({ userId: 'approver-1' });
      expect(prisma.userRole.findFirst).toHaveBeenCalledWith({
        where: { roleId: 'r1', OR: [{ effectiveTo: null }, { effectiveTo: { gt: expect.any(Date) } }] },
        orderBy: { effectiveFrom: 'asc' },
      });
    });

    it('uses the provided transaction client', async () => {
      const prisma = makePrisma();
      const tx = { userRole: { findFirst: jest.fn().mockResolvedValue({ userId: 'x' }) } };
      await new RoleAssignmentLookup(prisma as never).findActiveAssignment('r1', tx as never);
      expect(tx.userRole.findFirst).toHaveBeenCalled();
    });
  });

  describe('hasRole', () => {
    it('is false when the role does not exist', async () => {
      const prisma = makePrisma({ role: { findUnique: jest.fn().mockResolvedValue(null) } });
      expect(await new RoleAssignmentLookup(prisma as never).hasRole('u1', 'NOPE')).toBe(false);
    });

    it('is true when the user holds an active assignment', async () => {
      const prisma = makePrisma();
      expect(await new RoleAssignmentLookup(prisma as never).hasRole('u1', 'PROCUREMENT_MANAGER')).toBe(true);
    });
  });

  describe('roleCodesOf', () => {
    it('maps assignments to role codes', async () => {
      const prisma = makePrisma();
      expect(await new RoleAssignmentLookup(prisma as never).roleCodesOf('u1')).toEqual(['PROCUREMENT_MANAGER']);
    });
  });

  describe('assertRoleExists', () => {
    it('throws ROLE_NOT_FOUND when missing', async () => {
      const prisma = makePrisma({ role: { findUnique: jest.fn().mockResolvedValue(null) } });
      await expect(new RoleAssignmentLookup(prisma as never).assertRoleExists('NOPE')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('resolves when the role exists', async () => {
      const res = await new RoleAssignmentLookup(makePrisma() as never).assertRoleExists('PROCUREMENT_MANAGER');
      expect(res).toMatchObject({ id: 'role-1', code: 'PROCUREMENT_MANAGER' });
    });
  });

  describe('requireHolder', () => {
    it('throws NO_APPROVER when nobody holds the role', async () => {
      const prisma = makePrisma({ userRole: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn() } });
      const err = await new RoleAssignmentLookup(prisma as never).requireHolder('PROCUREMENT_MANAGER').catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).toMatchObject({ code: 'NO_APPROVER' });
    });

    it('throws ROLE_NOT_FOUND when the role does not exist', async () => {
      const prisma = makePrisma({ role: { findUnique: jest.fn().mockResolvedValue(null) } });
      await expect(new RoleAssignmentLookup(prisma as never).requireHolder('NOPE')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('resolves when a holder exists', async () => {
      const res = await new RoleAssignmentLookup(makePrisma() as never).requireHolder('PROCUREMENT_MANAGER');
      expect(res).toEqual({ userId: 'approver-1' });
    });
  });
});
