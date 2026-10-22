import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostTypeBar } from './cost-type-bar';

describe('CostTypeBar', () => {
  it('renders one segment per non-zero cost type', () => {
    render(<CostTypeBar byCostType={{ LABOR: 600, MATERIAL: 400 }} total={1000} usedPercent={40} />);
    expect(screen.getAllByTestId('cost-segment')).toHaveLength(2);
  });

  it('skips zero-value cost types instead of drawing empty segments', () => {
    // Segmen selebar 0 tetap memakan border/padding dan membuat bilah tampak
    // "belang" tanpa alasan.
    render(<CostTypeBar byCostType={{ LABOR: 1000, MATERIAL: 0 }} total={1000} usedPercent={0} />);
    expect(screen.getAllByTestId('cost-segment')).toHaveLength(1);
  });

  it('describes the composition in text for screen readers', () => {
    render(<CostTypeBar byCostType={{ LABOR: 600, MATERIAL: 400 }} total={1000} usedPercent={40} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Labor 60%, Material 40%, 40% used');
  });

  it('renders only a neutral track when there is no budget', () => {
    render(<CostTypeBar byCostType={{}} total={0} usedPercent={null} />);
    expect(screen.queryAllByTestId('cost-segment')).toHaveLength(0);
    expect(screen.getByTestId('cost-track')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('No budget');
  });

  it('keeps utilisation above 100% visible instead of clamping it away', () => {
    render(<CostTypeBar byCostType={{ LABOR: 100 }} total={100} usedPercent={150} />);
    expect(screen.getByTestId('cost-used-marker').getAttribute('style')).toContain('100%');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('150% used');
  });

  it('handles a single cost type covering the whole budget', () => {
    render(<CostTypeBar byCostType={{ MATERIAL: 500 }} total={500} usedPercent={0} />);
    const segments = screen.getAllByTestId('cost-segment');
    expect(segments).toHaveLength(1);
    expect(segments[0]!.getAttribute('style')).toContain('width: 100%');
  });
});
