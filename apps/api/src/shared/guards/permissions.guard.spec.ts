import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';

/**
 * Guard memakai `Reflector` + `PrismaService`. Test membangun instance dengan
 * keduanya distub: reflector mengembalikan daftar permission yang diminta, dan
 * prisma mengembalikan role assignment / keberadaan user.
 */
function makeContext(user: { sub?: string } | undefined) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as never;
}

function makeGuard(opts: {
  required: string[];
  assignments?: unknown[];
  userExists?: unknown;
}) {
  const reflector = { getAllAndOverride: () => opts.required } as never;
  const prisma = {
    userRole: { findMany: async () => opts.assignments ?? [] },
    user: { findUnique: async () => opts.userExists ?? null },
  } as never;
  return new PermissionsGuard(reflector, prisma);
}

describe('PermissionsGuard', () => {
  it('allows when the user holds every required permission', async () => {
    const guard = makeGuard({
      required: ['LegalEntity.VIEW'],
      assignments: [{ role: { permissions: [{ permission: { code: 'LegalEntity.VIEW' } }] } }],
    });
    await expect(guard.canActivate(makeContext({ sub: 'u1' }))).resolves.toBe(true);
  });

  it('throws 401 SESSION_STALE when the token subject no longer exists', async () => {
    const guard = makeGuard({ required: ['LegalEntity.VIEW'], assignments: [], userExists: null });
    const err = await guard.canActivate(makeContext({ sub: 'deleted-user' })).catch((e) => e);
    expect(err).toBeInstanceOf(UnauthorizedException);
    expect((err as UnauthorizedException).getResponse()).toEqual(
      expect.objectContaining({ code: 'SESSION_STALE' }),
    );
  });

  it('throws 403 PERMISSION_DENIED when the user exists but lacks the permission', async () => {
    const guard = makeGuard({ required: ['LegalEntity.VIEW'], assignments: [], userExists: { id: 'u1', status: 'ACTIVE' } });
    const err = await guard.canActivate(makeContext({ sub: 'u1' })).catch((e) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect((err as ForbiddenException).getResponse()).toEqual(
      expect.objectContaining({ code: 'PERMISSION_DENIED' }),
    );
  });
});
