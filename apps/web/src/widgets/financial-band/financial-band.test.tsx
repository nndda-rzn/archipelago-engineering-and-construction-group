import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { hasOutstanding, agingSegments, FinancialBandView } from './financial-band';
import type { AgingBucket } from '@aec/api-contracts';

/** Fixture bucket aging: `detail` selalu ada (kontrak) — kosong bila tidak diuji. */
const bucket = (b: string, amount: number): AgingBucket => ({ bucket: b, amount, detail: [] });

describe('hasOutstanding', () => {
  it('is false when every bucket is zero', () => {
    expect(hasOutstanding([bucket('CURRENT', 0), bucket('90+', 0)])).toBe(false);
  });
  it('is true when any bucket has value', () => {
    expect(hasOutstanding([bucket('CURRENT', 0), bucket('1-30', 5)])).toBe(true);
  });
  it('is false for an empty list', () => {
    expect(hasOutstanding([])).toBe(false);
  });
});

describe('agingSegments', () => {
  it('maps buckets to labelled segments preserving order', () => {
    expect(agingSegments([bucket('CURRENT', 100), bucket('1-30', 50)])).toEqual([
      { label: 'CURRENT', value: 100 },
      { label: '1-30', value: 50 },
    ]);
  });
  it('returns empty array for no buckets', () => {
    expect(agingSegments([])).toEqual([]);
  });
});

const viewProps = {
  cashFlow: {
    series: [{ month: '2026-01', cashIn: 100, cashOut: 40, net: 60 }],
    totalCashIn: 100,
    totalCashOut: 40,
    netCash: 60,
    generatedAt: '2026-01-31T00:00:00.000Z',
  },
  ar: [bucket('CURRENT', 100), bucket('90+', 50)],
  ap: [bucket('CURRENT', 30)],
  budget: 1000,
  actual: 820,
};

describe('FinancialBandView', () => {
  it('shows a shaped chart skeleton instead of a bare "Loading…" string', () => {
    render(<FinancialBandView {...viewProps} isLoading />);
    expect(screen.getByLabelText('Loading financial band')).toBeTruthy();
    expect(screen.queryByText(/loading/i)).toBeNull();
  });

  it('marks the active aging bucket neutral, never racing-red', () => {
    render(<FinancialBandView {...viewProps} bucket="CURRENT" />);
    const active = screen.getAllByRole('button', { pressed: true })[0]!;
    expect(active.className).toContain('bg-neutral-800');
    expect(active.className).not.toContain('racing-red');
  });

  it('renders the aging legend and the budget bullet', () => {
    render(<FinancialBandView {...viewProps} />);
    expect(screen.getAllByText('CURRENT').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('img', { name: /Budget burn: 82%/ })).toBeTruthy();
  });

  it('lays Cash Flow and the aging/burn column out as a balanced 12-col grid', () => {
    const { container } = render(<FinancialBandView {...viewProps} />);
    const grid = container.querySelector('[data-slot="financial-grid"]');
    expect(grid?.className).toContain('xl:grid-cols-12');
    expect(container.querySelector('[data-slot="financial-cashflow"]')?.className).toContain('xl:col-span-7');
    expect(container.querySelector('[data-slot="financial-side"]')?.className).toContain('xl:col-span-5');
  });

  it('groups aging and burn into a single side panel rather than separate cards', () => {
    const { container } = render(<FinancialBandView {...viewProps} />);
    const side = container.querySelector('[data-slot="financial-side"]')!;
    // one bordered panel for the side column, not one card per block
    expect(side.querySelectorAll('[data-slot="panel"]').length).toBe(1);
  });
});


