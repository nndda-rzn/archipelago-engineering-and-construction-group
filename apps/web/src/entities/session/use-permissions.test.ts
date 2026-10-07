import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const me = vi.hoisted(() => ({ data: undefined as { roles: string[]; permissions: string[] } | undefined }));

vi.mock('@/features/auth', () => ({
  useMe: () => ({ data: me.data }),
}));

import { usePermissions } from './use-permissions';

describe('usePermissions', () => {
  it('grants a permission the user holds', () => {
    me.data = { roles: ['BUYER'], permissions: ['Project.VIEW', 'Approval.VIEW'] };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('Project.VIEW')).toBe(true);
    expect(result.current.can('Analytics.VIEW')).toBe(false);
  });

  it('canAny is true when one of the codes is held', () => {
    me.data = { roles: ['BUYER'], permissions: ['Approval.VIEW'] };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canAny(['Analytics.VIEW', 'Approval.VIEW'])).toBe(true);
    expect(result.current.canAny(['Analytics.VIEW', 'Role.VIEW'])).toBe(false);
  });

  it('SUPER_ADMIN holds every permission', () => {
    me.data = { roles: ['SUPER_ADMIN'], permissions: [] };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('Analytics.VIEW')).toBe(true);
    expect(result.current.can('anything.at.all')).toBe(true);
  });

  it('denies everything when there is no session yet', () => {
    me.data = undefined;
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('Project.VIEW')).toBe(false);
  });
});
