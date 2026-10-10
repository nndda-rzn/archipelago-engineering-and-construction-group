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

const data = {
  metric: 'cashIn',
  dimension: 'project',
  items: [
    { key: 'p1', label: 'PLTU Unit 3 Balance of Plant', value: 1_538_329_411_765, share: 0.246 },
    { key: 'p2', label: 'Refinery Revamp', value: 1_532_809_090_909, share: 0.245 },
    { key: 'p3', label: 'Gas Turbine Installation', value: 193_947_273, share: 0.00003 },
  ],
  total: 6_256_138_966_310,
  others: { value: 0 },
  generatedAt: 'x',
};

const renderView = (over = {}) =>
  render(<DecompositionBarsView metric="cashIn" dimension="project" onDimensionChange={() => {}} data={data} {...over} />);

describe('DecompositionBarsView', () => {
  it('renders a single text table that reconciles items and others', () => {
    renderView();
    expect(screen.getByRole('table', { name: /contribution/i })).toBeTruthy();
    const table = screen.getByRole('table', { name: /contribution/i });
    expect(table.textContent).toMatch(/others/i);
    expect(table.textContent).toMatch(/total/i);
  });

  it('does not duplicate contributors in a separate aria-hidden bar list', () => {
    const { container } = renderView();
    // Bar hanya ada DI DALAM tabel (tidak ada daftar bar terpisah di luarnya).
    const table = screen.getByRole('table', { name: /contribution/i });
    // 3 item + 1 baris "Others" = 4 bar, semuanya di dalam tabel.
    expect(container.querySelectorAll('[data-slot="scale-fill"]').length).toBe(4);
    expect(table.querySelectorAll('[data-slot="scale-fill"]').length).toBe(4);
  });

  it('shows large values compactly with the full figure in the title', () => {
    renderView();
    const compact = screen.getByText('Rp 1,54 T');
    expect(compact.getAttribute('title')).toMatch(/Rp\s?1\.538\.329\.411\.765/);
    // Tidak ada angka 18-digit penuh yang tercetak di layar.
    expect(screen.queryByText(/1\.538\.329\.411\.765/)).toBeNull();
    // Total pun ringkas.
    expect(screen.getByText('Rp 6,26 T')).toBeTruthy();
  });

  it('truncates long contributor labels and exposes the full text via title', () => {
    renderView();
    const label = screen.getByText('PLTU Unit 3 Balance of Plant');
    expect(label.getAttribute('title')).toBe('PLTU Unit 3 Balance of Plant');
    expect(label.className).toContain('truncate');
  });

  it('colours the value by sign so contribution direction stays readable', () => {
    renderView({
      data: {
        ...data,
        items: [
          { key: 'p1', label: 'Up', value: 100, share: 0.9 },
          { key: 'p2', label: 'Down', value: -50, share: 0.1 },
        ],
      },
    });
    const up = screen.getByText('Rp 100');
    const down = screen.getByText('−Rp 50');
    expect(up.className).toContain('success');
    expect(down.className).toContain('destructive');
  });

  it('shows an error affordance on failure', () => {
    renderView({ isError: true, onRetry: () => {} });
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
