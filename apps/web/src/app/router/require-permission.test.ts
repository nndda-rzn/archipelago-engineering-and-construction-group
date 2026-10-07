import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPERADMIN_ONLY } from '@aec/shared-types';

const store = vi.hoisted(() => ({ user: null as { roles: string[]; permissions?: string[] } | null }));
const redirectSpy = vi.hoisted(() => vi.fn((opts: unknown) => ({ __redirect: opts })));

vi.mock('@tanstack/react-router', () => ({ redirect: redirectSpy }));
vi.mock('@/shared/lib/http', () => ({ getStoredUser: () => store.user }));

import { canAccess, requirePermission } from './require-permission';

const loc = (pathname: string) => ({ location: { pathname } });

describe('canAccess', () => {
  beforeEach(() => store.user = null);

  it('denies when there is no session', () => {
    expect(canAccess('Project.VIEW')).toBe(false);
  });

  it('allows a permission the user holds', () => {
    store.user = { roles: ['BUYER'], permissions: ['Project.VIEW'] };
    expect(canAccess('Project.VIEW')).toBe(true);
    expect(canAccess('Analytics.VIEW')).toBe(false);
  });

  it('SUPER_ADMIN holds everything, including SUPERADMIN_ONLY', () => {
    store.user = { roles: ['SUPER_ADMIN'], permissions: [] };
    expect(canAccess('Analytics.VIEW')).toBe(true);
    expect(canAccess(SUPERADMIN_ONLY)).toBe(true);
  });

  it('a non-admin never gets SUPERADMIN_ONLY', () => {
    store.user = { roles: ['BUYER'], permissions: ['Project.VIEW'] };
    expect(canAccess(SUPERADMIN_ONLY)).toBe(false);
  });
});

describe('requirePermission', () => {
  beforeEach(() => { store.user = null; redirectSpy.mockClear(); });

  it('throws a redirect to /forbidden carrying the origin when denied', () => {
    store.user = { roles: ['BUYER'], permissions: [] };
    expect(() => requirePermission('Analytics.VIEW')(loc('/analytics'))).toThrow();
    expect(redirectSpy).toHaveBeenCalledWith({ to: '/forbidden', search: { from: '/analytics' } });
  });

  it('does not redirect when the user holds the permission', () => {
    store.user = { roles: ['BUYER'], permissions: ['Analytics.VIEW'] };
    expect(() => requirePermission('Analytics.VIEW')(loc('/analytics'))).not.toThrow();
    expect(redirectSpy).not.toHaveBeenCalled();
  });
});
