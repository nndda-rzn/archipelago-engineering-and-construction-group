import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PermissionMatrix } from './permission-matrix';

const all = [
  { code: 'User.VIEW', resource: 'User', action: 'VIEW' },
  { code: 'User.CREATE', resource: 'User', action: 'CREATE' },
  { code: 'User.BLOCK', resource: 'User', action: 'BLOCK' },
  { code: 'Project.VIEW', resource: 'Project', action: 'VIEW' },
];

describe('PermissionMatrix', () => {
  it('renders one row per resource and shows the granted/total ratio', () => {
    render(<PermissionMatrix permissions={[all[0]!, all[3]!]} allPermissions={all} />);
    expect(screen.getByText('2/4')).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'User' })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'Project' })).toBeTruthy();
  });

  it('marks granted cells with an accessible label', () => {
    render(<PermissionMatrix permissions={[all[0]!]} allPermissions={all} />);
    expect(screen.getByLabelText('User.VIEW granted')).toBeTruthy();
  });
});
