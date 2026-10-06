import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowFunnel, funnelStages } from './workflow-funnel';

const byStep = [
  { stepOrder: 1, stepName: 'Manager', total: 11, approved: 9, rejected: 1, pending: 1, cancelled: 0 },
  { stepOrder: 2, stepName: 'Board', total: 6, approved: 4, rejected: 0, pending: 2, cancelled: 0 },
];

describe('funnelStages', () => {
  it('reads as entered → steps → approved', () => {
    expect(funnelStages(byStep).map((s) => s.label)).toEqual(['Entered', 'Step 1', 'Step 2', 'Approved']);
  });

  it('uses the last step for the approved count', () => {
    expect(funnelStages(byStep).at(-1)).toEqual({ label: 'Approved', value: 4 });
  });

  it('returns nothing without tasks', () => {
    expect(funnelStages([])).toEqual([]);
  });
});

describe('WorkflowFunnel', () => {
  it('renders one bar per stage', () => {
    const { container } = render(<WorkflowFunnel byStep={byStep} />);
    expect(container.querySelectorAll('[data-slot="funnel-bar"]')).toHaveLength(4);
  });

  it('describes every stage and its value for screen readers', () => {
    render(<WorkflowFunnel byStep={byStep} />);
    const img = screen.getByRole('img', { name: /Entered: 11 documents/ });
    expect(img.getAttribute('aria-label')).toMatch(/Approved: 4 documents/);
  });

  it('renders nothing when there are no tasks', () => {
    const { container } = render(<WorkflowFunnel byStep={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not divide by zero when every stage is empty', () => {
    const { container } = render(
      <WorkflowFunnel byStep={[{ stepOrder: 1, stepName: 'Solo', total: 0, approved: 0, rejected: 0, pending: 0, cancelled: 0 }]} />,
    );
    expect(container.querySelectorAll('[data-slot="funnel-bar"]').length).toBeGreaterThan(0);
  });
});
