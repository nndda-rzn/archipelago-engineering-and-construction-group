import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { waterfallSegments, WaterfallChart } from './waterfall-chart';
import { EvmBullets } from './evm-bullets';

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
});

describe('EvmBullets', () => {
  it('marks projects below 1.0 with the destructive tone and a target marker', () => {
    const { container } = render(
      <EvmBullets
        items={[
          { name: 'Ring Road', value: 0.82 },
          { name: 'Toll A-3', value: 1.05 },
        ]}
      />,
    );
    const fills = container.querySelectorAll('[data-slot="evm-bullet-fill"]');
    expect(fills[0]?.className).toContain('bg-destructive-700');
    expect(fills[1]?.className).toContain('bg-success-700');
    expect(screen.getByRole('img', { name: /Ring Road index 0.82 vs target 1.00/ })).toBeTruthy();
  });

  it('shows an empty message when there is no EVM data', () => {
    render(<EvmBullets items={[]} />);
    expect(screen.getByText('No EVM data.')).toBeTruthy();
  });
});
