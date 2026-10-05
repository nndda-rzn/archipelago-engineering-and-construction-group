import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CapitalStructureChart, capitalBars } from './capital-structure';

describe('capitalBars', () => {
  it('orders Contract → Budget → Actual and scales widths to the largest value', () => {
    const bars = capitalBars({ contract: 100, budget: 50, actual: 25 });
    expect(bars.map((b) => b.label)).toEqual(['Contract Value', 'Budget', 'Actual Cost']);
    expect(bars.map((b) => b.pct)).toEqual([100, 50, 25]);
  });

  it('gives 0% widths when everything is zero (no divide-by-zero)', () => {
    const bars = capitalBars({ contract: 0, budget: 0, actual: 0 });
    expect(bars.every((b) => b.pct === 0)).toBe(true);
  });

  it('flags an overrun when actual exceeds budget', () => {
    const bars = capitalBars({ contract: 100, budget: 50, actual: 80 });
    expect(bars.find((b) => b.label === 'Actual Cost')?.overrun).toBe(true);
  });

  it('does not flag overrun when actual is within budget', () => {
    const bars = capitalBars({ contract: 100, budget: 50, actual: 40 });
    expect(bars.find((b) => b.label === 'Actual Cost')?.overrun).toBe(false);
  });
});

describe('CapitalStructureChart', () => {
  it('renders the three money figures', () => {
    render(<CapitalStructureChart contract={84_200_000} budget={61_000_000} actual={44_100_000} projectCount={3} />);
    expect(screen.getByText('Contract Value')).toBeTruthy();
    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.getByText('Actual Cost')).toBeTruthy();
  });

  it('shows the actual-cost ratio against budget', () => {
    render(<CapitalStructureChart contract={84_200_000} budget={61_000_000} actual={44_100_000} projectCount={3} />);
    expect(screen.getByText(/72%/)).toBeTruthy();
  });
});
