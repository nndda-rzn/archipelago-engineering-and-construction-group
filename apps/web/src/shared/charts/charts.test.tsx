import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Donut, AreaTrend, RadarProfile, TreemapChart, Lollipop, FunnelSteps, CalendarHeatmap } from './charts';

describe('Donut', () => {
  it('lists each slice with a label and percentage', () => {
    render(<Donut title="Composition" data={[{ key: 'Collected', value: 60 }, { key: 'Billed', value: 40 }]} />);
    expect(screen.getByText('Collected')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
  });
  it('is honest when empty', () => {
    render(<Donut title="Composition" data={[]} />);
    expect(screen.getByText('None recorded.')).toBeTruthy();
  });
});

describe('AreaTrend', () => {
  it('renders when there are at least two periods', () => {
    const { container } = render(<AreaTrend title="Trend" series={[{ period: '2026-01', value: 10 }, { period: '2026-02', value: 30 }]} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });
  it('is honest with a single point', () => {
    render(<AreaTrend title="Trend" series={[{ period: '2026-01', value: 10 }]} />);
    expect(screen.getByText('Not enough periods to chart.')).toBeTruthy();
  });
});

describe('RadarProfile', () => {
  it('renders with three or more axes', () => {
    const { container } = render(<RadarProfile title="Health" axes={[{ axis: 'Cost', value: 80 }, { axis: 'Schedule', value: 60 }, { axis: 'Risk', value: 40 }]} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });
  it('needs at least three dimensions', () => {
    render(<RadarProfile title="Health" axes={[{ axis: 'Cost', value: 80 }]} />);
    expect(screen.getByText('Not enough dimensions.')).toBeTruthy();
  });
});

describe('TreemapChart', () => {
  it('renders proportional cells', () => {
    const { container } = render(<TreemapChart title="Vendors" data={[{ key: 'PT Baja', value: 100 }, { key: 'PT Semen', value: 50 }]} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });
});

describe('Lollipop', () => {
  it('ranks rows with an accessible value label', () => {
    render(<Lollipop title="Top vendors" data={[{ key: 'PT Baja', value: 100 }, { key: 'PT Semen', value: 50 }]} />);
    expect(screen.getByLabelText(/PT Baja: /)).toBeTruthy();
  });
});

describe('FunnelSteps', () => {
  it('renders each step of the flow', () => {
    render(<FunnelSteps title="Billing" steps={[{ key: 'Contract', value: 100 }, { key: 'Certified', value: 80 }, { key: 'Collected', value: 50 }]} />);
    expect(screen.getByText('Contract')).toBeTruthy();
    expect(screen.getByText('Collected')).toBeTruthy();
  });

  it('draws a bar only for non-zero steps (no fake minimum bar for 0)', () => {
    const { container } = render(<FunnelSteps title="Billing" steps={[{ key: 'Contract', value: 100 }, { key: 'Collected', value: 0 }]} />);
    // dua baris, tapi hanya satu bar yang benar-benar digambar
    expect(container.querySelectorAll('[data-slot="funnel-bar"]')).toHaveLength(1);
    expect(screen.getByText('0')).toBeTruthy();
  });
});

describe('CalendarHeatmap', () => {
  it('renders a cell per day', () => {
    const { container } = render(<CalendarHeatmap title="Daily reports" days={[{ date: '2026-01-01', count: 2 }, { date: '2026-01-02', count: 0 }]} />);
    expect(container.querySelectorAll('[data-slot="cal-cell"]').length).toBeGreaterThan(0);
  });
  it('is honest when empty', () => {
    render(<CalendarHeatmap title="Daily reports" days={[]} />);
    expect(screen.getByText('No daily data.')).toBeTruthy();
  });
});
