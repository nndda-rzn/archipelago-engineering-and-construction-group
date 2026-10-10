import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { AgingBucket } from '@aec/api-contracts';
import { AgingDetailDialog } from './aging-detail-dialog';

const ar: AgingBucket[] = [
  { bucket: 'CURRENT', amount: 0, detail: [] },
  {
    bucket: '31-60',
    amount: 18_000_000_000,
    detail: [
      { invoiceNumber: 'CINV-900111', party: 'PT Klien Utama', projectCode: 'PRJ-1', date: '2026-08-12T00:00:00.000Z', ageDays: 55, outstanding: 18_000_000_000 },
    ],
  },
];

describe('AgingDetailDialog', () => {
  it('shows the invoices behind the selected bucket', () => {
    render(<AgingDetailDialog open bucket="31-60" buckets={ar} side="AR" onOpenChange={() => {}} />);
    expect(screen.getByText('CINV-900111')).toBeTruthy();
    expect(screen.getByText('PT Klien Utama')).toBeTruthy();
  });

  it('does not render content when closed', () => {
    render(<AgingDetailDialog open={false} bucket="31-60" buckets={ar} side="AR" onOpenChange={() => {}} />);
    expect(screen.queryByText('CINV-900111')).toBeNull();
  });

  it('explains when a bucket has no invoices', () => {
    render(<AgingDetailDialog open bucket="90+" buckets={ar} side="AR" onOpenChange={() => {}} />);
    expect(screen.getByText(/No invoices in 90\+/i)).toBeTruthy();
  });

  it('closes when the close control is pressed', () => {
    const onOpenChange = vi.fn();
    render(<AgingDetailDialog open bucket="31-60" buckets={ar} side="AR" onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders a totals row consistent with the invoice list', () => {
    render(<AgingDetailDialog open bucket="31-60" buckets={ar} side="AR" onOpenChange={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/1 invoice/i)).toBeTruthy();
  });
});
