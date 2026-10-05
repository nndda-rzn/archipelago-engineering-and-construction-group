import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CapitalStructureChart, capitalBars } from './capital-structure';

describe('capitalBars', () => {
  it('orders Contract → Budget → Actual', () => {
    const bars = capitalBars({ contract: 100, budget: 50, actual: 25 });
    expect(bars.map((b) => b.label)).toEqual(['Contract Value', 'Budget', 'Actual Cost']);
  });

  it('scales every bar against Contract (nested), so Contract is the full-width reference', () => {
    const bars = capitalBars({ contract: 100, budget: 50, actual: 25 });
    expect(bars.map((b) => b.pct)).toEqual([100, 50, 25]);
  });

  it('shows Budget/Actual as fractions of Contract even when Contract is the largest', () => {
    // Kalau diskala ke nilai terbesar (Contract), hasilnya kebetulan sama — uji
    // justru saat Actual melebihi Contract: bar tetap relatif terhadap Contract.
    const bars = capitalBars({ contract: 100, budget: 90, actual: 120 });
    expect(bars.find((b) => b.label === 'Contract Value')?.pct).toBe(100);
    expect(bars.find((b) => b.label === 'Budget')?.pct).toBe(90);
    // Actual > Contract → melebihi 100% (dibatasi agar tetap dalam track).
    expect(bars.find((b) => b.label === 'Actual Cost')?.pct).toBe(100);
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

  it('gives each bar a visible track so short bars still read as bars', () => {
    const { container } = render(<CapitalStructureChart contract={84_200_000} budget={61_000_000} actual={44_100_000} projectCount={3} />);
    const tracks = container.querySelectorAll('[data-slot="capital-track"]');
    expect(tracks).toHaveLength(3);
  });
});
