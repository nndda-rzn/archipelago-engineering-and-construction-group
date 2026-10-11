import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { PermissionCatalog } from '@aec/api-contracts';
import { PermissionGrid } from './permission-grid';

const catalog: PermissionCatalog[] = [
  { code: 'PurchaseOrder.VIEW', resource: 'PurchaseOrder', action: 'VIEW', description: null, group: 'PROCUREMENT', isSensitive: false, sortOrder: 0 },
  { code: 'PurchaseOrder.APPROVE', resource: 'PurchaseOrder', action: 'APPROVE', description: null, group: 'PROCUREMENT', isSensitive: false, sortOrder: 0 },
  { code: 'Role.DELETE', resource: 'Role', action: 'DELETE', description: null, group: 'FOUNDATION', isSensitive: true, sortOrder: 0 },
];

describe('PermissionGrid', () => {
  it('renders a checkbox per applicable cell and reports the granted ratio', () => {
    render(<PermissionGrid catalog={catalog} value={['PurchaseOrder.VIEW']} onChange={() => {}} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'PurchaseOrder.VIEW' }).getAttribute('aria-checked')).toBe('true');
  });

  it('adds a permission when an unchecked cell is toggled', () => {
    const onChange = vi.fn();
    render(<PermissionGrid catalog={catalog} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'PurchaseOrder.APPROVE' }));
    expect(onChange).toHaveBeenCalledWith(['PurchaseOrder.APPROVE']);
  });

  it('removes a permission when a checked cell is toggled', () => {
    const onChange = vi.fn();
    render(<PermissionGrid catalog={catalog} value={['PurchaseOrder.VIEW', 'Role.DELETE']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'PurchaseOrder.VIEW' }));
    expect(onChange).toHaveBeenCalledWith(['Role.DELETE']);
  });

  it('marks sensitive permissions in the accessible label', () => {
    render(<PermissionGrid catalog={catalog} value={[]} onChange={() => {}} />);
    expect(screen.getByRole('checkbox', { name: 'Role.DELETE (sensitive)' })).toBeTruthy();
  });

  it('selects every permission in a group', () => {
    const onChange = vi.fn();
    render(<PermissionGrid catalog={catalog} value={[]} onChange={onChange} />);
    const procurement = screen.getByRole('region', { name: 'Procurement' });
    fireEvent.click(within(procurement).getByRole('button', { name: 'Select group' }));
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining(['PurchaseOrder.VIEW', 'PurchaseOrder.APPROVE']));
  });
});
