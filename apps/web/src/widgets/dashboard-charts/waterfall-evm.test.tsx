import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { waterfallSegments, WaterfallChart } from './waterfall-chart';
import { EvmSeriesBars } from './evm-series-bars';

describe('waterfallSegments', () => {
  it('chains deltas from the opening balance and closes at the total', () => {
    const segs = waterfallSegments([
      { label: 'Open', value: 100, kind: 'base' },
      { label: 'Collect', value: 50, kind: 'pos' },
      { label: 'Pay', value: -30, kind: 'neg' },
      { label: 'Close', value: 120, kind: 'total' },
    ]);
    expect(segs[0]).toMatchObject({ from: 0, to: 100 });
    expect(segs[1]).toMatchObject({ from: 100, to: 150 });
    expect(segs[2]).toMatchObject({ from: 150, to: 120 });
    expect(segs[3]).toMatchObject({ from: 0, to: 120 });
  });

  it('starts a floating segment from the running total', () => {
    const segs = waterfallSegments([
      { label: 'Open', value: 0, kind: 'base' },
      { label: 'Collect', value: 40, kind: 'pos' },
    ]);
    expect(segs[1]).toMatchObject({ from: 0, to: 40 });
  });
});

describe('WaterfallChart', () => {
  it('renders one bar per step and exposes a summary label', () => {
    const { container } = render(
      <WaterfallChart
        steps={[
          { label: 'Open', value: 100, kind: 'base' },
          { label: 'Collect', value: 50, kind: 'pos' },
          { label: 'Close', value: 150, kind: 'total' },
        ]}
      />,
    );
    expect(container.querySelectorAll('[data-slot="waterfall-bar"]')).toHaveLength(3);
    expect(screen.getByRole('img', { name: /Cash bridge/ })).toBeTruthy();
  });

  it('applies a caller className so the card can stretch it', () => {
    const { container } = render(
      <WaterfallChart
        className="flex-1 justify-between"
        steps={[
          { label: 'Open', value: 100, kind: 'base' },
          { label: 'Close', value: 100, kind: 'total' },
        ]}
      />,
    );
    const root = container.querySelector('[role="img"]')!;
    expect(root.className).toContain('flex-1');
    expect(root.className).toContain('justify-between');
  });
});

describe('EvmSeriesBars', () => {
  it('renders a CPI and an SPI bar per project with a target marker', () => {
    const { container } = render(
      <EvmSeriesBars
        items={[
          { name: 'Ring Road', cpi: 0.82, spi: 0.91 },
          { name: 'Toll A-3', cpi: 1.05, spi: 1.02 },
        ]}
      />,
    );
    const cpiFills = container.querySelectorAll('[data-slot="evm-series-fill"][data-series="cpi"]');
    const spiFills = container.querySelectorAll('[data-slot="evm-series-fill"][data-series="spi"]');
    expect(cpiFills).toHaveLength(2);
    expect(spiFills).toHaveLength(2);
    expect(screen.getByRole('img', { name: /Ring Road CPI 0.82 vs target 1.00/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Ring Road SPI 0.91 vs target 1.00/ })).toBeTruthy();
  });

  it('shows "no data" for a null ratio without drawing a bar', () => {
    const { container } = render(<EvmSeriesBars items={[{ name: 'No EVM', cpi: null, spi: null }]} />);
    expect(container.querySelectorAll('[data-slot="evm-series-fill"]')).toHaveLength(0);
    expect(screen.getByText('No EVM data.')).toBeTruthy();
  });

  it('shows an empty message when there is no EVM data', () => {
    render(<EvmSeriesBars items={[]} />);
    expect(screen.getByText('No EVM data.')).toBeTruthy();
  });

  it('caps rows at the limit, worst-first, and summarizes the rest', () => {
    const items = [
      { name: 'P1', cpi: 1.10, spi: 1.03 },
      { name: 'P2', cpi: 0.85, spi: 0.63 },
      { name: 'P3', cpi: 0.90, spi: 0.70 },
      { name: 'P4', cpi: 0.80, spi: 0.60 },
      { name: 'P5', cpi: 1.00, spi: 1.00 },
      { name: 'P6', cpi: 0.95, spi: 0.95 },
      { name: 'P7', cpi: 1.20, spi: 1.10 },
    ];
    const { container } = render(<EvmSeriesBars items={items} limit={5} />);
    const cpiFills = container.querySelectorAll('[data-slot="evm-series-fill"][data-series="cpi"]');
    expect(cpiFills).toHaveLength(5);
    // Worst-first: CPI 0.80 (P4) harus muncul; yang terbaik (P7) tersembunyi.
    expect(screen.getByText('P4')).toBeTruthy();
    expect(screen.queryByText('P7')).toBeNull();
    expect(screen.getByText('+2 more')).toBeTruthy();
  });

  it('counts projects without a baseline in the footer instead of a blank row', () => {
    const { container } = render(
      <EvmSeriesBars
        items={[
          { name: 'HasEVM', cpi: 0.9, spi: 0.9 },
          { name: 'NoEVM1', cpi: null, spi: null },
          { name: 'NoEVM2', cpi: null, spi: null },
        ]}
      />,
    );
    expect(container.querySelectorAll('[data-slot="evm-series-fill"][data-series="cpi"]')).toHaveLength(1);
    expect(screen.queryByText('NoEVM1')).toBeNull();
    expect(screen.getByText('2 without baseline')).toBeTruthy();
  });
});
