import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VarianceCell } from './variance-cell';

describe('VarianceCell', () => {
  it('renders a plus sign for a favourable variance', () => {
    render(<VarianceCell value={32_000_000} max={64_000_000} label="Variance" />);
    expect(screen.getByText(/^\+/)).toBeTruthy();
  });

  it('renders a minus sign for an unfavourable variance', () => {
    render(<VarianceCell value={-32_000_000} max={64_000_000} label="Variance" />);
    expect(screen.getByText(/^−/)).toBeTruthy();
  });

  it('renders no sign for zero', () => {
    const { container } = render(<VarianceCell value={0} max={64_000_000} label="Variance" />);
    expect(container.textContent).not.toMatch(/^[+−]/);
  });

  it('exposes the full amount in the title, not the compact form', () => {
    render(<VarianceCell value={-32_000_000} max={64_000_000} label="Variance" />);
    expect(screen.getByTitle(/32\.000\.000/)).toBeTruthy();
  });

  it('sizes the bar relative to the largest visible variance', () => {
    render(<VarianceCell value={32_000_000} max={64_000_000} label="Variance" />);
    expect(screen.getByTestId('variance-bar').getAttribute('style')).toContain('width: 50%');
  });

  it('draws no bar when there is nothing to scale against', () => {
    render(<VarianceCell value={0} max={0} label="Variance" />);
    expect(screen.queryByTestId('variance-bar')).toBeNull();
  });

  it('describes the value for screen readers instead of relying on colour', () => {
    render(<VarianceCell value={-32_000_000} max={64_000_000} label="Variance" />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/variance/i);
  });
});
