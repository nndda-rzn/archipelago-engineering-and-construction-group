import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { VendorDetail } from '@aec/api-contracts';
import { VendorDetailPanel } from './vendor-detail-panel';

vi.mock('../model/master-data.api', () => ({
  useVendorDetail: () => ({
    data: detail,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useSetVendorStatus: () => ({ mutate: vi.fn(), isPending: false }),
}));

const detail: VendorDetail = {
  vendor: {
    id: 'v1', vendorCode: 'VND-2026-000001', name: 'PT Baja Utama', taxId: '01.234', category: 'MATERIAL',
    contactPerson: 'Rudi Hartono', email: 'sales@baja.co.id', phone: '+62 21 5550', address: 'Jakarta',
    status: 'ACTIVE', createdAt: 'x', updatedAt: 'x',
  },
  performance: { overall: 4.5, count: 3, byCategory: { DELIVERY: { count: 2, avg: 4.5 }, QUALITY: { count: 1, avg: 4 } } },
  spend: { postedInvoiceValue: 6_200_000_000, invoiceCount: 3, poCount: 12 },
};

describe('VendorDetailPanel', () => {
  it('shows the vendor identity and contact details', () => {
    render(<VendorDetailPanel vendorId="v1" onEdit={() => {}} />);
    expect(screen.getByText('PT Baja Utama')).toBeTruthy();
    expect(screen.getByText('Rudi Hartono')).toBeTruthy();
    expect(screen.getByText('sales@baja.co.id')).toBeTruthy();
  });

  it('shows the performance summary with an overall score', () => {
    render(<VendorDetailPanel vendorId="v1" onEdit={() => {}} />);
    const perf = screen.getByLabelText('Performance');
    expect(perf.textContent).toMatch(/Overall/);
    expect(perf.textContent).toMatch(/4\.5/);
    expect(screen.getByText('DELIVERY')).toBeTruthy();
  });

  it('shows spend and PO count compactly', () => {
    render(<VendorDetailPanel vendorId="v1" onEdit={() => {}} />);
    expect(screen.getByText('Rp 6,2 M')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('offers edit and deactivate actions', () => {
    render(<VendorDetailPanel vendorId="v1" onEdit={() => {}} />);
    expect(screen.getByRole('button', { name: /edit/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /deactivate/i })).toBeTruthy();
  });
});
