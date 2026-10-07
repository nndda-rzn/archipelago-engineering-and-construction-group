import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskHeatmap } from '@aec/ui';

describe('RiskHeatmap', () => {
  it('renders a 5x5 grid and labels non-empty cells', () => {
    render(<RiskHeatmap cells={[{ likelihood: 4, impact: 5, count: 2 }]} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/4.*5.*2/);
  });

  it('renders 25 cells regardless of how many carry a count', () => {
    const { container } = render(<RiskHeatmap cells={[{ likelihood: 1, impact: 1, count: 3 }]} />);
    expect(container.querySelectorAll('[data-slot="risk-cell"]')).toHaveLength(25);
  });

  it('exposes each filled cell as L×I = count via title', () => {
    const { container } = render(<RiskHeatmap cells={[{ likelihood: 3, impact: 2, count: 5 }]} />);
    const filled = Array.from(container.querySelectorAll('[data-slot="risk-cell"]')).find((c) => c.getAttribute('title'));
    expect(filled?.getAttribute('title')).toBe('3×2 = 5');
  });

  it('renders an empty grid with a neutral label when there are no risks', () => {
    render(<RiskHeatmap cells={[]} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/no open risks/i);
  });
});
