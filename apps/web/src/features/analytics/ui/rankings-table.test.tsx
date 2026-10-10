import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankingsTableView } from './rankings-table';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

describe('RankingsTableView', () => {
  it('renders one row per contributor', () => {
    render(
      <RankingsTableView
        title="Top clients"
        dimension="client"
        data={{
          metric: 'cashIn',
          dimension: 'client',
          items: [
            { key: 'a', label: 'Acme', value: 80, share: 0.7 },
            { key: 'b', label: 'Beta', value: 20, share: 0.2 },
          ],
          total: 115,
          others: { value: 15 },
          generatedAt: 'x',
        }}
      />,
    );
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(2);
  });
});
