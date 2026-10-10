import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/features/analytics/ui/scope-bar', () => ({
  ScopeBar: () => <div data-testid="scope-bar" />,
  useAnalyticsScope: () => ({
    filter: {},
    preset: 'YTD',
    entityId: '',
    setPreset: () => {},
    setEntity: () => {},
    metric: 'cashIn',
    setMetric: () => {},
    dimension: 'project',
    setDimension: () => {},
    compare: false,
    setCompare: () => {},
  }),
}));
vi.mock('@/features/analytics/ui/trend-explorer', () => ({ TrendExplorer: () => <div data-testid="trend-explorer" /> }));
vi.mock('@/features/analytics/ui/decomposition-bars', () => ({ DecompositionBars: () => <div data-testid="decomposition-bars" /> }));
vi.mock('@/features/analytics/ui/rankings-table', () => ({ RankingsTable: () => <div data-testid="rankings-table" /> }));
vi.mock('@/features/analytics/ui/distributions', () => ({ Distributions: () => <div data-testid="distributions" /> }));

import { AnalyticsDashboardPage } from './analytics-dashboard.page';

describe('AnalyticsDashboardPage', () => {
  it('renders the five zones', () => {
    renderWithProviders(<AnalyticsDashboardPage />);
    ['scope-bar', 'trend-explorer', 'decomposition-bars', 'rankings-table', 'distributions'].forEach((id) => {
      expect(screen.getByTestId(id)).toBeTruthy();
    });
  });

  it('no longer renders anomaly triage (moved to the Control Tower)', () => {
    const { container } = renderWithProviders(<AnalyticsDashboardPage />);
    expect(container.textContent).not.toMatch(/anomaly triage/i);
  });

  it('does not render a "bank balances" champion (cash-in is not a bank balance)', () => {
    const { container } = renderWithProviders(<AnalyticsDashboardPage />);
    expect(container.textContent).not.toMatch(/bank balances/i);
  });
});
