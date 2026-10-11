import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { GanttRow } from '@aec/api-contracts';
import { GanttChart } from './gantt-chart';

const rows: GanttRow[] = [
  { id: 'ca1', group: 'Work package', label: 'Engineering', start: '2026-01-01T00:00:00.000Z', end: '2026-03-01T00:00:00.000Z', progress: 100, isCriticalPath: true, baselineStart: '2026-01-01T00:00:00.000Z', baselineEnd: '2026-02-20T00:00:00.000Z' },
  { id: 'ca2', group: 'Work package', label: 'Construction', start: '2026-03-01T00:00:00.000Z', end: '2026-08-01T00:00:00.000Z', progress: 40, isCriticalPath: false, baselineStart: null, baselineEnd: null },
  { id: 'ms1', group: 'Milestone', label: 'Handover', start: '2026-08-01T00:00:00.000Z', end: '2026-08-01T00:00:00.000Z', progress: null, isCriticalPath: false, baselineStart: null, baselineEnd: null, milestone: true },
];

describe('GanttChart', () => {
  it('renders a bar per scheduled row and a diamond per milestone', () => {
    const { container } = render(<GanttChart rows={rows} />);
    expect(container.querySelectorAll('[data-slot="gantt-bar"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-slot="gantt-milestone"]')).toHaveLength(1);
  });

  it('draws a progress fill inside a bar that has progress', () => {
    const { container } = render(<GanttChart rows={rows} />);
    expect(container.querySelectorAll('[data-slot="gantt-progress"]').length).toBeGreaterThan(0);
  });

  it('marks critical-path bars', () => {
    const { container } = render(<GanttChart rows={rows} />);
    expect(container.querySelectorAll('[data-slot="gantt-bar"][data-critical="true"]')).toHaveLength(1);
  });

  it('labels every row for assistive tech', () => {
    render(<GanttChart rows={rows} />);
    expect(screen.getByLabelText(/Engineering 2026-01-01/)).toBeTruthy();
    expect(screen.getByText('Handover')).toBeTruthy();
  });

  it('shows a legend and an honest empty state', () => {
    render(<GanttChart rows={rows} />);
    expect(screen.getByText('Critical path')).toBeTruthy();
    render(<GanttChart rows={[]} />);
    expect(screen.getByText('No scheduled activities.')).toBeTruthy();
  });
});
