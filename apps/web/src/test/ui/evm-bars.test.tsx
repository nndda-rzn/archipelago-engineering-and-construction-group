import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvmBars, evmRatios, type EvmMetrics } from '@aec/ui';

const metrics: EvmMetrics = { pv: 100, ev: 80, ac: 90, bac: 120, cpi: 0.89, spi: 0.8, cv: -10, sv: -20 };

describe('evmRatios', () => {
  it('scales PV/EV/AC against the largest of the three so bars are comparable', () => {
    const r = evmRatios(metrics);
    expect(r.pv).toBe(100);
    expect(r.ev).toBe(80);
    expect(r.ac).toBe(90);
  });

  it('never divides by zero when all values are zero', () => {
    const r = evmRatios({ pv: 0, ev: 0, ac: 0, bac: 0, cpi: null, spi: null, cv: 0, sv: 0 });
    expect(r).toEqual({ pv: 0, ev: 0, ac: 0 });
  });
});

describe('EvmBars', () => {
  it('renders the three bars with an accessible label', () => {
    const { container } = render(<EvmBars metrics={metrics} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/PV/i);
    expect(container.querySelectorAll('[data-slot="evm-bar"]')).toHaveLength(3);
  });

  it('shows CPI and SPI as numbers (not a gauge)', () => {
    render(<EvmBars metrics={metrics} />);
    expect(screen.getByText('0.89')).toBeTruthy();
    expect(screen.getByText('0.80')).toBeTruthy();
  });

  it('shows an em dash instead of a fake ratio when CPI/SPI are null', () => {
    const { container } = render(<EvmBars metrics={{ ...metrics, cpi: null, spi: null }} />);
    expect(container.textContent).toMatch(/—/);
  });

  it('marks index values below 1.0 as a warning direction', () => {
    const { container } = render(<EvmBars metrics={metrics} />);
    const idx = container.querySelectorAll('[data-slot="evm-index"]');
    expect(idx.length).toBe(2);
    expect(idx[0]!.getAttribute('data-ok')).toBe('false');
  });
});
