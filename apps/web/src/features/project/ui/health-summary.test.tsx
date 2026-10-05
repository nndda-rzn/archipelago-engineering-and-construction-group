import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthSummary, getHealthBarColor } from './health-summary';
import type { ProjectHealth } from '@aec/api-contracts';

const baseHealth: ProjectHealth = {
  projectId: 'p1',
  projectCode: 'PRJ-E2E',
  projectName: 'Project E2E',
  client: 'Client A',
  legalEntityCode: 'AEC-CON',
  contractValue: 10_000_000,
  totalBudget: 9_000_000,
  totalActual: 8_000_000,
  revenue: 7_000_000,
  variance: 1_000_000,
  utilization: 88,
  health: 'ON_TRACK',
  generatedAt: '2026-08-28T00:00:00Z',
  wbs: [],
};

describe('getHealthBarColor', () => {
  it('ON_TRACK -> semantic success', () => {
    expect(getHealthBarColor('ON_TRACK')).toBe('bg-semantic-success');
  });
  it('AT_RISK -> semantic warning', () => {
    expect(getHealthBarColor('AT_RISK')).toBe('bg-semantic-warning');
  });
  it('CRITICAL -> destructive', () => {
    expect(getHealthBarColor('CRITICAL')).toBe('bg-destructive-600');
  });
});

describe('HealthSummary', () => {
  it('render nama project + meta', () => {
    render(<HealthSummary data={baseHealth} />);
    expect(screen.getByText('Project E2E')).toBeTruthy();
    expect(screen.getByText(/PRJ-E2E/)).toBeTruthy();
  });

  it('render label health ON_TRACK', () => {
    const { container } = render(<HealthSummary data={baseHealth} />);
    expect(container.textContent).toContain('On Track');
  });

  it('render metric Budget dengan format IDR', () => {
    const { container } = render(<HealthSummary data={baseHealth} />);
    expect(container.textContent).toContain('9.000.000');
  });

  it('render Utilisasi percentage', () => {
    const { container } = render(<HealthSummary data={baseHealth} />);
    expect(container.textContent).toContain('88%');
  });

  it('render Variance positif', () => {
    const { container } = render(<HealthSummary data={baseHealth} />);
    expect(container.textContent).toContain('1.000.000');
  });
});