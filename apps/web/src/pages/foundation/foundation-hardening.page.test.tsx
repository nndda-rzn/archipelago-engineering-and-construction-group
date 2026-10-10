import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FoundationHardeningPage } from './foundation-hardening.page';

vi.mock('@/features/foundation-hardening/ui', () => ({
  HardeningTabs: () => <div data-testid="tabs" />,
  OrgSection: () => <div data-testid="org" />,
  DoaSection: () => <div data-testid="doa" />,
  CurrencyRateSection: () => <div data-testid="currency" />,
  DoaForm: () => <div data-testid="doa-form" />,
  ResolveForm: () => <div data-testid="resolve" />,
  CurrencyForm: () => <div data-testid="currency-form" />,
}));
vi.mock('@/features/foundation-hardening', () => ({
  useOrganizations: () => ({ data: [], isLoading: false, isError: false, refetch: () => {} }),
  useDoaRules: () => ({ data: { items: [] }, isLoading: false, isError: false, refetch: () => {} }),
  useDoaAnalysis: () => ({ data: undefined, isLoading: false }),
  useSetDoaRuleStatus: () => ({ mutate: () => {} }),
  useCurrencies: () => ({ data: { items: [] } }),
  useExchangeRates: () => ({ data: { items: [] }, isLoading: false }),
}));
vi.mock('@/entities/legal-entity', () => ({ useLegalEntities: () => ({ data: { items: [] } }) }));
vi.mock('@/shared/lib/use-url-state', () => ({ useUrlFilter: (_k: string, d: string) => [d, () => {}] }));

describe('FoundationHardeningPage', () => {
  it('renders tabs and the organization section by default', () => {
    render(<FoundationHardeningPage />);
    expect(screen.getByTestId('tabs')).toBeTruthy();
    expect(screen.getByTestId('org')).toBeTruthy();
  });

  it('does not mention ifc or readiness', () => {
    const { container } = render(<FoundationHardeningPage />);
    expect(container.textContent).not.toMatch(/IFC|readiness/i);
  });
});
