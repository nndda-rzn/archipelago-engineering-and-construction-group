import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostComposition } from './cost-composition';

const composition = [
  { costType: 'LABOR' as const, amount: 400_000_000 },
  { costType: 'MATERIAL' as const, amount: 240_000_000 },
  { costType: 'SUBCONTRACTOR' as const, amount: 240_000_000 },
  { costType: 'EQUIPMENT' as const, amount: 120_000_000 },
];

describe('CostComposition', () => {
  it('lists one row per cost type, largest first', () => {
    render(<CostComposition composition={composition} />);
    const rows = screen.getAllByTestId(/^composition-row-/);
    expect(rows).toHaveLength(4);
    expect(rows[0]!.textContent).toMatch(/Labor/);
  });

  it('scales each bar against the largest value, not the total', () => {
    render(<CostComposition composition={composition} />);
    // Labor 400 jt adalah yang terbesar, jadi bar-nya penuh.
    expect(screen.getByTestId('composition-bar-LABOR').getAttribute('style')).toContain('width: 100%');
    expect(screen.getByTestId('composition-bar-EQUIPMENT').getAttribute('style')).toContain('width: 30%');
  });

  it('shows the share of the total as a percentage', () => {
    render(<CostComposition composition={composition} />);
    expect(screen.getByTestId('composition-row-LABOR').textContent).toMatch(/40%/);
  });

  it('shows the amount in the same money format as the rest of the page', () => {
    render(<CostComposition composition={composition} />);
    expect(screen.getByTestId('composition-row-LABOR').textContent).toMatch(/Rp 400 jt/);
  });

  it('renders a stacked summary bar showing the proportion of the whole', () => {
    render(<CostComposition composition={composition} />);
    const bar = screen.getByTestId('composition-total-bar');
    expect(bar.getAttribute('aria-label')).toMatch(/Labor/);
  });

  it('skips zero-value cost types instead of drawing empty rows', () => {
    render(<CostComposition composition={[{ costType: 'LABOR', amount: 100 }]} />);
    expect(screen.getAllByTestId(/^composition-row-/)).toHaveLength(1);
  });

  it('explains itself when there is no budget at all', () => {
    render(<CostComposition composition={[]} />);
    expect(screen.getByText(/no budget/i)).toBeTruthy();
    expect(screen.queryByTestId('composition-total-bar')).toBeNull();
  });
});
