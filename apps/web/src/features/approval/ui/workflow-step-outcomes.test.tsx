import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { WorkflowInsights } from '@aec/api-contracts';
import { WorkflowStepOutcomes } from './workflow-step-outcomes';

type ByStep = WorkflowInsights['byStep'];

const byStep: ByStep = [
  { stepOrder: 1, stepName: 'Procurement manager approval', total: 11, approved: 7, rejected: 1, pending: 3, cancelled: 0 },
  { stepOrder: 2, stepName: 'Board approval', total: 6, approved: 4, rejected: 0, pending: 2, cancelled: 0 },
];

describe('WorkflowStepOutcomes', () => {
  it('renders one row per step, in order', () => {
    render(<WorkflowStepOutcomes byStep={byStep} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toMatch(/Step 1/);
    expect(rows[1]!.textContent).toMatch(/Step 2/);
  });

  it('shows each step name so the row is not just a number', () => {
    render(<WorkflowStepOutcomes byStep={byStep} />);
    expect(screen.getByText('Procurement manager approval')).toBeTruthy();
    expect(screen.getByText('Board approval')).toBeTruthy();
  });

  it('gives every step an accessible name with the full outcome counts', () => {
    render(<WorkflowStepOutcomes byStep={byStep} />);
    // Pembaca layar harus dapat angka lengkapnya, bukan hanya melihat bar.
    const row = screen.getByLabelText(/Step 1: 11 tasks — 7 approved, 1 rejected, 3 pending, 0 cancelled/);
    expect(row).toBeTruthy();
  });

  it('explains that fewer tasks at a later step is routing, not loss', () => {
    render(<WorkflowStepOutcomes byStep={byStep} />);
    // Tanpa kalimat ini, 11 → 6 terbaca sebagai "5 dokumen gugur" padahal tidak.
    expect(screen.getByText(/not every document needs every step/i)).toBeTruthy();
  });

  it('does not render bars that pretend to be a funnel', () => {
    const { container } = render(<WorkflowStepOutcomes byStep={byStep} />);
    expect(container.querySelector('[data-slot="funnel-bar"]')).toBeNull();
  });

  it('renders a legend so colour is never the only signal', () => {
    render(<WorkflowStepOutcomes byStep={byStep} />);
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.getByText('Rejected')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
  });

  it('shows the total per step as text', () => {
    render(<WorkflowStepOutcomes byStep={byStep} />);
    expect(screen.getByText('11')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('renders nothing when there are no steps', () => {
    const { container } = render(<WorkflowStepOutcomes byStep={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
