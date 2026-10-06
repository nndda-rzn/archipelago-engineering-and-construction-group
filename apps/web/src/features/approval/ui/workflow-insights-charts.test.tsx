import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { WorkflowInsights } from '@aec/api-contracts';
import { AmountThresholdChart, CoverageRing, MonthlyVolumeChart } from './workflow-insights-charts';

const base: WorkflowInsights = {
  transactionType: 'PurchaseRequisition',
  generatedAt: '2026-10-06T00:00:00.000Z',
  scope: {
    requested: { definitionId: 'def-1', code: 'PR_APPROVAL', version: 2 },
    applied: 'type',
    taskCount: 0,
    versionBreakdown: [],
  },
  byStep: [],
  documents: { entered: 0, approved: 0, rejected: 0, pending: 0, cancelled: 0, approvalRate: 0 },
  monthly: [],
  amounts: { count: 0, min: null, max: null, buckets: [] },
  ruleHits: [],
  coverage: [],
  thresholds: [],
  note: 'note',
};

describe('MonthlyVolumeChart', () => {
  it('renders nothing for a single month (one point is not a trend)', () => {
    const { container } = render(<MonthlyVolumeChart monthly={[{ month: '2026-08', created: 4, decided: 3 }]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a chart with an accessible figure for two or more months', () => {
    const { container } = render(
      <MonthlyVolumeChart
        monthly={[
          { month: '2026-08', created: 4, decided: 3 },
          { month: '2026-09', created: 5, decided: 4 },
        ]}
      />,
    );
    expect(container.querySelector('figure')).toBeTruthy();
    // Legenda memberi padanan teks, bukan hanya warna.
    expect(screen.getByText('Submitted')).toBeTruthy();
    expect(screen.getByText('Decided')).toBeTruthy();
  });
});

describe('CoverageRing', () => {
  it('shows the percentage and counts as text, not only as a ring', () => {
    render(<CoverageRing total={4} covered={3} uncovered={1} />);
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByRole('img', { name: /3 of 4 steps have at least one approver/i })).toBeTruthy();
    expect(screen.getByText(/would stall/i)).toBeTruthy();
  });

  it('states plainly when every step is covered', () => {
    render(<CoverageRing total={2} covered={2} uncovered={0} />);
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText(/All covered/i)).toBeTruthy();
  });

  it('handles zero steps without dividing by zero', () => {
    render(<CoverageRing total={0} covered={0} uncovered={0} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });
});

describe('AmountThresholdChart', () => {
  it('renders nothing when there are no documents', () => {
    const { container } = render(<AmountThresholdChart insights={base} />);
    expect(container.firstChild).toBeNull();
  });

  it('draws a bar per bucket and a line per real threshold', () => {
    const insights: WorkflowInsights = {
      ...base,
      amounts: {
        count: 11,
        min: 2_000_000,
        max: 150_000_000_000,
        buckets: [
          { label: '< 10jt', count: 1, from: 0, to: 10_000_000 },
          { label: '100jt-1M', count: 6, from: 100_000_000, to: 1_000_000_000 },
        ],
      },
      thresholds: [{ stepOrder: 2, stepName: 'Board approval', field: 'estimatedTotal', op: '>', value: 5_000_000 }],
    };
    const { container } = render(<AmountThresholdChart insights={insights} />);
    expect(container.querySelectorAll('[data-slot="amount-bar"]').length).toBe(2);
    expect(container.querySelectorAll('[data-slot="threshold-line"]').length).toBe(1);
    // Deskripsi gambar menyebut sebaran dan ambang, bukan hanya "chart".
    const img = screen.getByRole('img', { name: /Document value distribution/i });
    expect(img.getAttribute('aria-label')).toMatch(/Approval thresholds/i);
  });

  it('does not draw a threshold line when there are none', () => {
    const insights: WorkflowInsights = {
      ...base,
      amounts: { count: 1, min: 1, max: 1, buckets: [{ label: '< 10jt', count: 1, from: 0, to: 10_000_000 }] },
    };
    const { container } = render(<AmountThresholdChart insights={insights} />);
    expect(container.querySelectorAll('[data-slot="threshold-line"]').length).toBe(0);
  });
});
