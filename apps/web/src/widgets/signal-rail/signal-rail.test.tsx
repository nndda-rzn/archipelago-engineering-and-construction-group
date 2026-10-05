import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildSignals, SignalRailView } from './signal-rail';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const base = {
  openNcrs: 2, openIncidents: 1, overduePm: 0, openPunchItems: 0, openClaims: 5,
  pendingApprovals: 2, overdueAr: 0, anomalies: { high: 3, medium: 0, low: 0 },
};

describe('buildSignals', () => {
  it('drops zero-count signals', () => {
    const keys = buildSignals(base).map((s) => s.key);
    expect(keys).not.toContain('pm');
    expect(keys).not.toContain('punch');
  });

  it('orders by severity then count', () => {
    const sig = buildSignals(base);
    expect(sig[0]!.severity).toBe('high'); // anomalies high=3
    expect(sig[0]!.key).toBe('anomalies');
  });

  it('deep-links carry filter params', () => {
    const ncrs = buildSignals(base).find((s) => s.key === 'ncrs')!;
    expect(ncrs.to).toBe('/quality?tab=ncrs');
  });
});

describe('SignalRail empty state', () => {
  it('renders all-clear when every signal is zero', () => {
    const zero = {
      ...base,
      openNcrs: 0,
      openIncidents: 0,
      openClaims: 0,
      pendingApprovals: 0,
      anomalies: { high: 0, medium: 0, low: 0 },
    };
    render(<SignalRailView signals={buildSignals(zero)} />);
    expect(screen.getByText(/all clear/i)).toBeTruthy();
  });
});
