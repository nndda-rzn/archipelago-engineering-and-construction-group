import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RateHistoryView } from './rate-history';

describe('RateHistoryView', () => {
  it('renders safely with a single data point', () => {
    render(
      <RateHistoryView
        data={{ fromCurrencyId: 'c1', toCurrencyId: 'c2', rateType: 'SPOT', points: [{ effectiveDate: '2026-01-01', rate: 15000 }], generatedAt: 'x' }}
      />,
    );
    expect(screen.getByRole('img', { name: /rate/i })).toBeTruthy();
  });

  it('shows an empty state when there are no points', () => {
    render(
      <RateHistoryView
        data={{ fromCurrencyId: 'c1', toCurrencyId: 'c2', rateType: 'SPOT', points: [], generatedAt: 'x' }}
      />,
    );
    expect(screen.getByText(/no rate history/i)).toBeTruthy();
  });
});
