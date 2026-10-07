import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ControlTowerProject } from '@aec/api-contracts';
import { PortfolioScatter, evmPoints } from './portfolio-scatter';

const base: ControlTowerProject = {
  projectId: 'p1',
  projectCode: 'PRJ-1',
  projectName: 'One',
  client: 'X',
  health: 'ON_TRACK',
  contractValue: 100,
  budget: 80,
  actual: 40,
  variance: 40,
  revenue: 0,
  utilization: 40,
  progressPct: 50,
  cpi: 1.05,
  spi: 1.02,
  hasEvm: true,
  riskScore: 4,
};

describe('evmPoints', () => {
  it('keeps only projects with EVM and non-null ratios', () => {
    const pts = evmPoints([base, { ...base, projectId: 'p2', hasEvm: false, cpi: null, spi: null }]);
    expect(pts.map((p) => p.projectId)).toEqual(['p1']);
  });
});

describe('PortfolioScatter', () => {
  it('shows an honest empty state when no project has EVM', () => {
    render(<PortfolioScatter projects={[{ ...base, hasEvm: false, cpi: null, spi: null }]} />);
    expect(screen.getByText('No EVM baseline published yet.')).toBeTruthy();
  });

  it('renders a labelled scatter and a text fallback per point', () => {
    render(<PortfolioScatter projects={[base]} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/PRJ-1/);
    expect(screen.getByText('PRJ-1')).toBeTruthy();
  });
});
