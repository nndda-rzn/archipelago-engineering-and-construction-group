import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DecompositionBarsView } from './decomposition-bars';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe('DecompositionBarsView', () => {
  it('renders a text table that reconciles items and others', () => {
    render(
      <DecompositionBarsView
        metric="cashIn"
        dimension="client"
        onDimensionChange={() => {}}
        data={{
          metric: 'cashIn',
          dimension: 'client',
          items: [{ key: 'a', label: 'Acme', value: 80, share: 0.7 }],
          total: 115,
          others: { value: 15 },
          generatedAt: 'x',
        }}
      />,
    );
    expect(screen.getByRole('table', { name: /contribution/i })).toBeTruthy();
    expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);
    const table = screen.getByRole('table', { name: /contribution/i });
    expect(table.textContent).toMatch(/others/i);
    expect(table.textContent).toMatch(/total/i);
  });

  it('shows an error affordance on failure', () => {
    render(<DecompositionBarsView metric="cashIn" dimension="client" onDimensionChange={() => {}} isError onRetry={() => {}} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
