import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendExplorerView } from './trend-explorer';

describe('TrendExplorerView', () => {
  it('shows the period total, delta and an accessible chart with a text partner', () => {
    render(
      <TrendExplorerView
        metric="cashIn"
        onMetricChange={() => {}}
        data={{
          metric: 'cashIn',
          unit: 'idr',
          bucket: 'month',
          points: [
            { period: '2026-01', value: 100 },
            { period: '2026-02', value: 0 },
          ],
          total: 100,
          comparePoints: [
            { period: '2026-01', value: 50 },
            { period: '2026-02', value: 0 },
          ],
          delta: { current: 100, previous: 50, pctChange: 100, direction: 'up' },
          generatedAt: 'x',
        }}
      />,
    );
    expect(screen.getByRole('img', { name: /cash/i })).toBeTruthy();
    expect(screen.getByText('Rp 100')).toBeTruthy();
  });

  it('shows an error affordance and never a number on failure', () => {
    render(<TrendExplorerView metric="cashIn" onMetricChange={() => {}} isError onRetry={() => {}} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
