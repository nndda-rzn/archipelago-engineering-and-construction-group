import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { computeRunway, workingCapitalGap, LiquidityPanelView } from './liquidity-panel';

describe('computeRunway', () => {
  it('divides cash by monthly burn', () => {
    expect(computeRunway(600, 100)).toBe(6);
  });
  it('returns null when burn is zero or negative', () => {
    expect(computeRunway(600, 0)).toBeNull();
    expect(computeRunway(600, -5)).toBeNull();
  });
});

describe('workingCapitalGap', () => {
  it('is AR minus AP', () => {
    expect(workingCapitalGap(4100, 2600)).toBe(1500);
  });
});

describe('LiquidityPanelView', () => {
  it('renders cash on hand, runway and gap labels', () => {
    render(<LiquidityPanelView cashOnHand={18240500000} burnSeries={[3, 4, 5]} ar={4100} ap={2600} runwayMonths={6.4} />);
    expect(screen.getByText(/cash on hand/i)).toBeTruthy();
    expect(screen.getByText(/6\.4/)).toBeTruthy();
  });

  it('renders empty-safe when all values are zero', () => {
    render(<LiquidityPanelView cashOnHand={0} burnSeries={[]} ar={0} ap={0} runwayMonths={null} />);
    expect(screen.getByText(/cash on hand/i)).toBeTruthy();
  });
});
