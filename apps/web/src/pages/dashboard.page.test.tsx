import { beforeEach, describe, expect, it, vi } from 'vitest';
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
vi.mock('@/features/project', () => ({ usePortfolio: () => ({ data: { items: [] } }) }));
vi.mock('@/widgets/dashboard-charts', () => ({ ProjectRankingBar: () => <div data-testid="ranking" /> }));

// Gating analytics memakai usePermissions. Default: izin penuh (semua widget
// tampil, sama seperti sebelum gating). Test Buyer men-set izin terbatas.
const perms = vi.hoisted(() => ({ can: (() => true) as (code: string) => boolean }));
vi.mock('@/entities/session', () => ({
  usePermissions: () => ({ set: new Set(), can: perms.can, canAny: () => true }),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    perms.can = () => true;
  });

  it('renders the zones', async () => {
    const { DashboardPage } = await import('./dashboard.page');
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    for (const id of ['filter-bar', 'signal-rail', 'hero-band', 'liquidity', 'financial-band', 'triage', 'ranking']) {
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

  it('hides the analytics widgets for a user without Analytics.VIEW (e.g. Buyer)', async () => {
    // Buyer tidak punya Analytics.VIEW → widget yang memanggil endpoint analytics
    // harus hilang, sehingga tidak ada request yang berakhir 403.
    perms.can = (code) => code !== 'Analytics.VIEW';
    const { DashboardPage } = await import('./dashboard.page');
    render(<DashboardPage />);

    expect(screen.getByTestId('filter-bar')).toBeTruthy();
    expect(screen.getByTestId('ranking')).toBeTruthy(); // portfolio tetap
    for (const id of ['signal-rail', 'hero-band', 'liquidity', 'financial-band', 'triage']) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });
});
