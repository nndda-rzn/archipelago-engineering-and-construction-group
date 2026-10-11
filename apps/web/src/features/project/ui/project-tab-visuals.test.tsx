import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ProjectSchedule } from '@aec/api-contracts';
import { MixBars, ProjectRiskHeatmap, SCurveCompare, BillingBar } from './project-tab-visuals';

describe('MixBars', () => {
  it('renders one labelled bar per category', () => {
    render(<MixBars title="NCR by severity" data={[{ key: 'MAJOR', count: 2 }, { key: 'MINOR', count: 1 }]} />);
    expect(screen.getByText('Major')).toBeTruthy();
    expect(screen.getByText('Minor')).toBeTruthy();
  });

  it('shows an honest empty state', () => {
    render(<MixBars title="Documents" data={[]} emptyHint="Nothing yet." />);
    expect(screen.getByText('Nothing yet.')).toBeTruthy();
  });
});

describe('ProjectRiskHeatmap', () => {
  it('renders a heatmap cell for each risk bucket', () => {
    const { container } = render(<ProjectRiskHeatmap cells={[{ likelihood: 4, impact: 4, count: 2 }]} />);
    expect(container.querySelector('[data-slot="risk-cell"]')).toBeTruthy();
  });

  it('states plainly when there are no risks', () => {
    render(<ProjectRiskHeatmap cells={[]} />);
    expect(screen.getByText('No open risks.')).toBeTruthy();
  });
});

const schedule: ProjectSchedule = {
  progressPlanned: 55,
  progressActual: 48,
  plannedCurve: [
    { period: '2026-Q1', planned: 100, plannedCumulative: 100, plannedPct: 25 },
    { period: '2026-Q2', planned: 300, plannedCumulative: 400, plannedPct: 100 },
  ],
  actualProgressCurve: [
    { period: '2026-01', value: 100, cumulative: 100, pct: 20 },
    { period: '2026-02', value: 300, cumulative: 400, pct: 95 },
  ],
  actualCostCurve: [{ period: '2026-01', value: 50, cumulative: 50 }, { period: '2026-02', value: 150, cumulative: 200 }],
  milestones: [],
  phases: [],
  gates: [],
};

describe('SCurveCompare', () => {
  it('shows a planned and an actual line with the latest percentages', () => {
    render(<SCurveCompare schedule={schedule} />);
    expect(screen.getAllByText('Planned').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Actual').length).toBeGreaterThan(0);
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('95%')).toBeTruthy();
  });

  it('is honest when there is no actual curve', () => {
    render(<SCurveCompare schedule={{ ...schedule, actualProgressCurve: [] }} />);
    expect(screen.getByText(/actual curve unavailable/i)).toBeTruthy();
  });
});

describe('BillingBar', () => {
  it('renders a stacked bar and the collected/billed/certified figures', () => {
    const { container } = render(<BillingBar billing={{ certified: 1000, billed: 800, collected: 500, approvedVariation: 0 }} contractValue={2000} />);
    expect(container.querySelectorAll('[data-slot="stacked-segment"]').length).toBeGreaterThan(0);
    expect(screen.getByText('Collected')).toBeTruthy();
    expect(screen.getByText('Certified')).toBeTruthy();
  });
});
