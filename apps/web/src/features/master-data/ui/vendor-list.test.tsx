import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Vendor } from '@aec/api-contracts';
import { VendorList } from './vendor-list';

const vendors: Vendor[] = [
  { id: 'v1', vendorCode: 'VND-2026-000001', name: 'PT Baja Utama', taxId: '01.234', category: 'MATERIAL', contactPerson: 'Rudi', email: 'a@b.co', phone: '+62', address: 'Jakarta', status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' },
  { id: 'v2', vendorCode: 'VND-2026-000002', name: 'PT Supplier Lama', taxId: null, category: 'SERVICE', contactPerson: null, email: null, phone: null, address: null, status: 'INACTIVE', createdAt: 'x', updatedAt: 'x' },
];

describe('VendorList', () => {
  it('renders each vendor with its code, name and a category chip', () => {
    render(<VendorList vendors={vendors} selectedId="" onSelect={() => {}} />);
    expect(screen.getByText('PT Baja Utama')).toBeTruthy();
    expect(screen.getByText('VND-2026-000001')).toBeTruthy();
    expect(screen.getAllByText('MATERIAL').length).toBeGreaterThanOrEqual(1);
  });

  it('marks the selected vendor for assistive tech', () => {
    render(<VendorList vendors={vendors} selectedId="v2" onSelect={() => {}} />);
    const selected = screen.getByRole('option', { selected: true });
    expect(selected.textContent).toContain('PT Supplier Lama');
  });

  it('calls onSelect with the vendor id when a row is clicked', () => {
    const onSelect = vi.fn();
    render(<VendorList vendors={vendors} selectedId="" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('PT Baja Utama'));
    expect(onSelect).toHaveBeenCalledWith('v1');
  });

  it('shows an inactive marker for deactivated vendors', () => {
    render(<VendorList vendors={vendors} selectedId="" onSelect={() => {}} />);
    expect(screen.getByText('Inactive')).toBeTruthy();
  });
});
