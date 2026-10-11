import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ProjectSchedule, ProjectCashFlow } from '@aec/api-contracts';
import { GlanceStrip, SCurve, MilestoneBand, CashChain } from './project-command-center';

const schedule: ProjectSchedule = {
  progressPlanned: 55,
  progressActual: 48,
  plannedCurve: [
    { period: '2026-Q1', planned: 100, plannedCumulative: 100, plannedPct: 25 },
    { period: '2026-Q2', planned: 300, plannedCumulative: 400, plannedPct: 100 },
  ],
  milestones: [
    { id: 'm1', name: 'Design Freeze', plannedDate: '2026-03-01T00:00:00.000Z', actualDate: '2026-05-01T00:00:00.000Z', status: 'ACHIEVED', weight: 20, isCritical: true, notes: null },
    { id: 'm2', name: 'Handover', plannedDate: '2027-06-01T00:00:00.000Z', actualDate: null, status: 'PLANNED', weight: 20, isCritical: false, notes: null },
  ],
  phases: [],
  gates: [],
};

const cashFlow: ProjectCashFlow = {
  projectId: 'p1',
  chain: [
    { key: 'contract', label: 'Contract', value: 1000 },
    { key: 'budget', label: 'Budget', value: 900 },
    { key: 'committed', label: 'Committed', value: 500 },
    { key: 'actual', label: 'Actual', value: 400 },
    { key: 'billed', label: 'Billed', value: 300 },
    { key: 'collected', label: 'Collected', value: 200 },
  ],
  generatedAt: '',
};

describe('GlanceStrip', () => {
  it('renders one number per signal with its label', () => {
    render(<GlanceStrip signals={[
      { key: 'schedule', label: 'Schedule', value: -7, unit: 'pts', tone: 'warn' },
      { key: 'cpi', label: 'CPI', value: 0.99, unit: '', tone: 'warn' },
    ]} />);
    expect(screen.getByText('Schedule')).toBeTruthy();
    expect(screen.getByText('-7')).toBeTruthy();
    expect(screen.getByText('CPI')).toBeTruthy();
  });

  it('shows an em dash for a null value', () => {
    render(<GlanceStrip signals={[{ key: 'cpi', label: 'CPI', value: null, unit: '', tone: 'neutral' }]} />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});

describe('SCurve', () => {
  it('shows planned vs actual and the variance', () => {
    render(<SCurve schedule={schedule} />);
    expect(screen.getByText('55%')).toBeTruthy();
    expect(screen.getByText('48%')).toBeTruthy();
    expect(screen.getByText('-7 pts')).toBeTruthy();
    expect(screen.getByLabelText(/S-curve: planned 55%, actual 48%/)).toBeTruthy();
  });
});

describe('MilestoneBand', () => {
  it('renders a dot per milestone and marks critical ones', () => {
    const { container } = render(<MilestoneBand schedule={schedule} />);
    expect(container.querySelectorAll('[data-slot="milestone-dot"]')).toHaveLength(2);
    expect(screen.getByText('Design Freeze')).toBeTruthy();
    expect(screen.getByLabelText('critical')).toBeTruthy();
  });
});

describe('CashChain', () => {
  it('renders one bar per step in the chain', () => {
    const { container } = render(<CashChain cashFlow={cashFlow} />);
    expect(container.querySelectorAll('[data-slot="cash-bar"]')).toHaveLength(6);
    expect(screen.getByText('Contract')).toBeTruthy();
    expect(screen.getByText('Collected')).toBeTruthy();
  });
});
