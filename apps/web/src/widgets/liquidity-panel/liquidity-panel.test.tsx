import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { computeRunway, computeNetBurn, workingCapitalGap, LiquidityPanelView } from './liquidity-panel';

describe('computeRunway', () => {
  it('divides cash by monthly burn', () => {
    expect(computeRunway(600, 100)).toBe(6);
  });
  it('returns null when burn is zero or negative', () => {
    expect(computeRunway(600, 0)).toBeNull();
    expect(computeRunway(600, -5)).toBeNull();
  });
});

describe('computeNetBurn', () => {
  it('is the average deficit of loss-making months', () => {
    // net: +50 (surplus), -200, -100  → only deficits average: (200+100)/2 = 150
    expect(computeNetBurn([50, -200, -100])).toBe(150);
  });
  it('is zero when every month is cash-generative', () => {
    expect(computeNetBurn([50, 120, 30])).toBe(0);
  });
  it('is zero for an empty series', () => {
    expect(computeNetBurn([])).toBe(0);
  });
  it('ignores zero-net months when averaging deficits', () => {
    expect(computeNetBurn([0, -80])).toBe(80);
  });
});

describe('workingCapitalGap', () => {
  it('is AR minus AP', () => {
    expect(workingCapitalGap(4100, 2600)).toBe(1500);
  });
});

describe('LiquidityPanelView', () => {
  const base = { netSeries: [3, 4, 5], ar: 4100, ap: 2600, runwayMonths: 6.4, monthlyBurn: 2900 };

  it('leads with runway and does NOT duplicate cash on hand', () => {
    render(<LiquidityPanelView {...base} />);
    expect(screen.getByText(/6\.4/)).toBeTruthy();
    expect(screen.queryByText(/cash on hand/i)).toBeNull();
  });

  it('shows a no-net-burn note instead of a runway figure when cash-generative', () => {
    render(<LiquidityPanelView netSeries={[50, 120]} ar={0} ap={0} runwayMonths={null} monthlyBurn={0} />);
    expect(screen.getByText(/no net burn/i)).toBeTruthy();
    expect(screen.queryByText(/months/i)).toBeNull();
  });

  it('renders a diverging AR/AP bar with a zero baseline', () => {
    const { container } = render(<LiquidityPanelView {...base} />);
    expect(container.querySelector('[data-slot="diverging-zero"]')).toBeTruthy();
  });

  it('renders a working-capital gap of zero in a neutral tone, not positive', () => {
    const { container } = render(<LiquidityPanelView {...base} ar={100} ap={100} />);
    const gap = container.querySelector('[data-slot="wc-gap"]')!;
    expect(gap.className).toContain('text-neutral-950');
    expect(gap.className).not.toContain('financial-positive');
  });

  it('renders a positive gap with the positive token', () => {
    const { container } = render(<LiquidityPanelView {...base} ar={200} ap={100} />);
    expect(container.querySelector('[data-slot="wc-gap"]')?.className).toContain('text-financial-positive-600');
  });

  it('shows a shaped skeleton while loading', () => {
    render(<LiquidityPanelView {...base} isLoading />);
    expect(screen.getByLabelText('Loading liquidity')).toBeTruthy();
  });
});
