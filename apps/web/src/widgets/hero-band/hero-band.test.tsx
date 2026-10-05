import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { heroNarrative, summarizePortfolio, HeroBandView } from './hero-band';

describe('heroNarrative', () => {
  it('states cash on hand, net flow direction, critical projects and open NCRs', () => {
    const text = heroNarrative({ cashOnHand: 18240500000, netCashFlow: 420000000, criticalProjects: 3, openNcrs: 2 });
    expect(text).toMatch(/cash on hand/i);
    expect(text).toMatch(/positive/i);
    expect(text).toContain('3');
    expect(text).toContain('2');
  });

  it('says negative flow when net cash flow is below zero', () => {
    expect(heroNarrative({ cashOnHand: 0, netCashFlow: -5, criticalProjects: 0, openNcrs: 0 })).toMatch(/negative/i);
  });
});

describe('summarizePortfolio', () => {
  it('re-aggregates KPI from a filtered item list', () => {
    const items = [
      { projectId: 'p1', projectCode: 'A', projectName: 'A', client: 'C', status: 'ACTIVE', contractValue: 100, budget: 80, actual: 90, revenue: 0, variance: -10, utilization: 112, health: 'CRITICAL' as const },
      { projectId: 'p2', projectCode: 'B', projectName: 'B', client: 'C', status: 'ACTIVE', contractValue: 200, budget: 150, actual: 100, revenue: 0, variance: 50, utilization: 66, health: 'ON_TRACK' as const },
    ];
    const s = summarizePortfolio(items);
    expect(s.projectCount).toBe(2);
    expect(s.totalContract).toBe(300);
    expect(s.totalBudget).toBe(230);
    expect(s.totalActual).toBe(190);
    expect(s.criticalProjects).toBe(1);
  });

  it('returns zeroed totals for an empty list', () => {
    expect(summarizePortfolio([])).toEqual({ projectCount: 0, totalContract: 0, totalBudget: 0, totalActual: 0, criticalProjects: 0 });
  });
});

const baseView = {
  cashOnHand: 18240500000,
  netCashFlow: 420000000,
  criticalProjects: 3,
  openNcrs: 2,
  contract: 84_200_000_000,
  budget: 61_000_000_000,
  actual: 44_100_000_000,
  projectCount: 3,
};

describe('HeroBandView', () => {
  it('colours cash on hand neutral (not green) when it is exactly zero', () => {
    const { container } = render(<HeroBandView {...baseView} cashOnHand={0} />);
    const figure = container.querySelector('[data-slot="cash-on-hand"]')!;
    expect(figure.className).toContain('text-neutral-950');
    expect(figure.className).not.toContain('financial-positive');
  });

  it('colours positive cash on hand with the financial-positive token', () => {
    const { container } = render(<HeroBandView {...baseView} />);
    const figure = container.querySelector('[data-slot="cash-on-hand"]')!;
    expect(figure.className).toContain('text-financial-positive-600');
  });

  it('colours negative cash on hand with the financial-negative token', () => {
    const { container } = render(<HeroBandView {...baseView} cashOnHand={-1} />);
    const figure = container.querySelector('[data-slot="cash-on-hand"]')!;
    expect(figure.className).toContain('text-financial-negative-600');
  });

  it('renders the champion figure at the display size', () => {
    const { container } = render(<HeroBandView {...baseView} />);
    expect(container.querySelector('[data-slot="cash-on-hand"]')?.className).toContain('text-display');
  });

  it('renders a shaped skeleton instead of a misleading Rp 0 while loading', () => {
    render(<HeroBandView {...baseView} isLoading />);
    expect(screen.getByLabelText('Loading hero')).toBeTruthy();
    expect(screen.queryByText(/Rp\s?0/)).toBeNull();
  });

  it('wraps the hero in a bordered panel so it matches the liquidity card', () => {
    const { container } = render(<HeroBandView {...baseView} />);
    const panel = container.querySelector('[data-slot="panel"]');
    expect(panel?.className).toContain('border-neutral-200');
    expect(panel?.className).toContain('bg-white');
  });

  it('shows a cash sparkline trend when a series is provided', () => {
    render(<HeroBandView {...baseView} cashSeries={[10, 12, 9, 14]} />);
    expect(screen.getByRole('img', { name: /Cash trend/i })).toBeTruthy();
  });

  it('omits the sparkline when no series is provided', () => {
    const { container } = render(<HeroBandView {...baseView} />);
    expect(container.querySelector('[data-slot="cash-sparkline"]')).toBeNull();
  });

  it('renders the capital-structure chart instead of a metric-card grid', () => {
    const { container } = render(<HeroBandView {...baseView} />);
    expect(container.querySelector('[data-slot="capital-structure"]')).toBeTruthy();
    expect(screen.getByText('Contract Value')).toBeTruthy();
    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.getByText('Actual Cost')).toBeTruthy();
  });
});
