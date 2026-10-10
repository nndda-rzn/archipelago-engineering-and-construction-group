import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Distributions } from './distributions';

vi.mock('../model/analytics.api', () => ({
  useCostComposition: () => ({ data: { items: [{ costType: 'MATERIAL', amount: 100 }], total: 100, generatedAt: 'x' }, isLoading: false, isError: false, refetch: () => {} }),
  useAging: () => ({ data: { ar: [], ap: [], asOf: 'x', basisDate: 'invoiceDate', generatedAt: 'x' }, isLoading: false, isError: false, refetch: () => {} }),
  useArConcentration: () => ({ data: { items: [{ client: 'Acme', amount: 50, pct: 100 }], total: 50, generatedAt: 'x' }, isLoading: false, isError: false, refetch: () => {} }),
  useForecastVsActual: () => ({ data: { periods: [{ period: '2026-01', forecastNet: 10, actualNet: 8 }], generatedAt: 'x' }, isLoading: false, isError: false, refetch: () => {} }),
}));

describe('Distributions', () => {
  it('renders four distribution panels', () => {
    render(<Distributions filter={{}} />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });
});
