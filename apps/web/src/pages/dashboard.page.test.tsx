import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));
vi.mock('@/widgets/dashboard-filter-bar', () => ({
  useDashboardFilter: () => ({ filter: {}, preset: 'YTD', entityId: '', setPreset: vi.fn(), setEntity: vi.fn() }),
  DashboardFilterBar: () => <div data-testid="filter-bar" />,
}));
vi.mock('@/widgets/signal-rail', () => ({ SignalRail: () => <div data-testid="signal-rail" /> }));
vi.mock('@/widgets/hero-band', () => ({ HeroBand: () => <div data-testid="hero-band" /> }));
vi.mock('@/widgets/liquidity-panel', () => ({ LiquidityPanel: () => <div data-testid="liquidity" /> }));
vi.mock('@/widgets/financial-band', () => ({ FinancialBand: () => <div data-testid="financial-band" /> }));
vi.mock('@/widgets/portfolio-canvas', () => ({ PortfolioCanvas: () => <div data-testid="canvas" /> }));
vi.mock('@/widgets/portfolio-spine', () => ({ PortfolioSpine: () => <div data-testid="spine" /> }));
vi.mock('@/widgets/anomaly-triage', () => ({ AnomalyTriage: () => <div data-testid="triage" /> }));

describe('DashboardPage', () => {
  it('renders the zones', async () => {
    const { DashboardPage } = await import('./dashboard.page');
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    for (const id of ['filter-bar', 'signal-rail', 'hero-band', 'liquidity', 'financial-band', 'triage']) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
  });

  it('caps content width so ultra-wide screens do not stretch the layout', async () => {
    const { DashboardPage } = await import('./dashboard.page');
    const { container } = render(<DashboardPage />);
    expect(container.querySelector('.max-w-\\[1600px\\]')).toBeTruthy();
  });

  it('renders the financial band as its own zone, not nested under the hero/liquidity row', async () => {
    const { DashboardPage } = await import('./dashboard.page');
    render(<DashboardPage />);
    const hero = screen.getByTestId('hero-band');
    const financial = screen.getByTestId('financial-band');
    const row = hero.closest('[data-slot="hero-liquidity-row"]');
    expect(row).toBeTruthy();
    expect(row?.contains(financial)).toBe(false);
  });
});
