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

describe('DashboardPage', () => {
  it('renders the five zones', async () => {
    const { DashboardPage } = await import('./dashboard.page');
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    for (const id of ['filter-bar', 'signal-rail', 'hero-band', 'liquidity', 'financial-band']) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
  });
});
