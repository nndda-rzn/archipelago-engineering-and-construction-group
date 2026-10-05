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
    expect(sig[0]!.severity).toBe('high');
    expect(sig[0]!.key).toBe('anomalies');
  });

  it('NCR signal deep-links with OPEN status filter', () => {
    const s = buildSignals(base).find((x) => x.key === 'ncrs')!;
    expect(s.to).toBe('/quality?tab=ncrs&status=OPEN');
  });
});

describe('SignalRailView age', () => {
  it('shows the oldest age in the chip context', () => {
    render(
      <SignalRailView
        signals={[{ key: 'ncrs', severity: 'high', count: 2, label: 'NCRs', context: 'open', ageDays: 12, to: '/quality?tab=ncrs&status=OPEN' }]}
      />,
    );
    expect(screen.getByText(/12d/)).toBeTruthy();
  });
});

describe('SignalRail empty state', () => {
  it('renders all-clear when every signal is zero', () => {
    const zero = { ...base, openNcrs: 0, openIncidents: 0, openClaims: 0, pendingApprovals: 0, anomalies: { high: 0, medium: 0, low: 0 } };
    render(<SignalRailView signals={buildSignals(zero)} />);
    expect(screen.getByText(/all clear/i)).toBeTruthy();
  });
});
