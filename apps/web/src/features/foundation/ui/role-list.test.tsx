import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { RoleWithPermissions } from '@aec/api-contracts';
import { RoleList } from './role-list';

const role = (over: Partial<RoleWithPermissions>): RoleWithPermissions => ({
  id: 'r1', code: 'BUYER', name: 'Buyer', description: 'Membuat PR', status: 'ACTIVE',
  category: 'FUNCTIONAL', isSystem: false, isAssignable: true,
  memberCount: 1, permissionCount: 9, permissions: [], ...over,
});

describe('RoleList', () => {
  it('shows role name, code, category and member count', () => {
    render(<RoleList roles={[role({})]} selectedId="" onSelect={() => {}} permissionTotal={171} />);
    expect(screen.getByText('Buyer')).toBeTruthy();
    expect(screen.getByText('BUYER')).toBeTruthy();
    expect(screen.getByText('functional')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('flags a role with no permissions as empty', () => {
    render(<RoleList roles={[role({ permissionCount: 0 })]} selectedId="" onSelect={() => {}} permissionTotal={171} />);
    expect(screen.getByText('empty')).toBeTruthy();
  });

  it('flags a role nobody holds as unused', () => {
    render(<RoleList roles={[role({ memberCount: 0, permissionCount: 9 })]} selectedId="" onSelect={() => {}} permissionTotal={171} />);
    expect(screen.getByText('unused')).toBeTruthy();
  });

  it('marks the selected role and calls onSelect on click', () => {
    const onSelect = vi.fn();
    render(<RoleList roles={[role({})]} selectedId="r1" onSelect={onSelect} permissionTotal={171} />);
    const option = screen.getByRole('option', { selected: true });
    fireEvent.click(option);
    expect(onSelect).toHaveBeenCalledWith('r1');
  });
});
