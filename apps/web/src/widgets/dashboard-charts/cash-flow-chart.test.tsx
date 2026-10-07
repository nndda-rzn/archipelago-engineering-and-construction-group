import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CashFlowChart, cashFlowSummary } from './charts';

describe('cashFlowSummary', () => {
  it('totals in, out and net across months', () => {
    const s = cashFlowSummary([
      { cashIn: 100, cashOut: 40 },
      { cashIn: 50, cashOut: 30 },
    ]);
    expect(s).toEqual({ in: 150, out: 70, net: 80 });
  });

  it('reports a negative net when out exceeds in', () => {
    expect(cashFlowSummary([{ cashIn: 10, cashOut: 25 }]).net).toBe(-15);
  });

  it('is zero for an empty series', () => {
    expect(cashFlowSummary([])).toEqual({ in: 0, out: 0, net: 0 });
  });
});

describe('CashFlowChart', () => {
  const data = [
    { month: '2026-01', cashIn: 1_000_000_000, cashOut: 400_000_000 },
    { month: '2026-02', cashIn: 500_000_000, cashOut: 300_000_000 },
  ];

  it('renders a text summary of total in/out/net', () => {
    render(<CashFlowChart data={data} />);
    expect(screen.getByText(/Total in/)).toBeTruthy();
    expect(screen.getByText(/Total out/)).toBeTruthy();
    expect(screen.getByText(/Net/)).toBeTruthy();
  });

  it('shows an honest empty state when there is no movement', () => {
    render(<CashFlowChart data={[]} />);
    expect(screen.getByText('No cash movement in this period.')).toBeTruthy();
  });
});
