import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ProjectSummary } from '@aec/api-contracts';
import { MixDonut, ProjectRiskHeatmap, HealthRadar, BillingFunnel } from './project-tab-visuals';

describe('MixDonut', () => {
  it('renders each category as a slice label', () => {
    render(<MixDonut title="NCR by severity" data={[{ key: 'MAJOR', count: 2 }, { key: 'MINOR', count: 1 }]} />);
    expect(screen.getByText('Major')).toBeTruthy();
    expect(screen.getByText('Minor')).toBeTruthy();
  });

  it('shows an honest empty state', () => {
    render(<MixDonut title="Documents" data={[]} emptyHint="Nothing yet." />);
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

const summary = {
  cost: { contractValue: 1000, budget: 900, committed: 500, actual: 400, certified: 800, billed: 700, collected: 600, cpi: 0.98 },
  schedule: { progressPlanned: 55, progressActual: 48, variance: -7, milestoneTotal: 5, milestoneAchieved: 4, milestoneMissed: 1, gateHold: 0 },
  domains: {
    commercial: { contract: 1, progressClaim: 800, clientInvoice: 700, collection: 600, variation: 0 },
    procurement: { pr: 1, po: 1, vendorInvoice: 1, subcontract: 0 },
    execution: { workPackage: 1, dailyReport: 1 },
    quality: { ncrOpen: 2, punchOpen: 0 },
    hse: { incidentOpen: 1 },
    governance: { riskOpen: 3, gateHold: 0 },
    engineering: { drawing: 1, deliverable: 1 },
  },
  analytics: { riskMatrix: [], qualityMix: [], hseMix: [], documentsMix: [], billing: { certified: 800, billed: 700, collected: 600, approvedVariation: 0 } },
} as unknown as ProjectSummary;

describe('HealthRadar', () => {
  it('renders a radar profile with the five dimensions', () => {
    const { container } = render(<HealthRadar summary={summary} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
    expect(screen.getByText('Project health (higher is healthier)')).toBeTruthy();
  });
});

describe('BillingFunnel', () => {
  it('renders the four billing steps', () => {
    render(<BillingFunnel summary={summary} />);
    expect(screen.getByText('Contract')).toBeTruthy();
    expect(screen.getByText('Certified')).toBeTruthy();
    expect(screen.getByText('Collected')).toBeTruthy();
  });
});
