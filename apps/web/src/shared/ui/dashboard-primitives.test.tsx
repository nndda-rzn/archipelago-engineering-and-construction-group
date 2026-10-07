import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MiniStat, SectionBand, StatTile, StatusPill, ExceptionQueue, severityBreakdown, type ExceptionItem } from '@aec/ui';

describe('StatusPill', () => {
  it('always renders its label (colour is never the only signal)', () => {
    render(<StatusPill tone="critical" label="Critical" />);
    expect(screen.getByText('Critical')).toBeTruthy();
  });

  it('uses the token colour class for the tone', () => {
    const { container } = render(<StatusPill tone="warning" label="At Risk" />);
    expect(container.querySelector('[class*="text-warning-700"]')).toBeTruthy();
  });
});

describe('StatTile', () => {
  it('renders value, delta and target attainment', () => {
    render(
      <StatTile
        label="Cash on hand"
        value="Rp 18.240.500.000"
        delta={{ pct: 12.4, direction: 'up' }}
        attainmentPct={121.6}
        targetLabel="122% of Rp 15B min"
        meetsTarget
        direction="MIN"
      />,
    );
    expect(screen.getByText('Rp 18.240.500.000')).toBeTruthy();
    expect(screen.getByText('122% of Rp 15B min')).toBeTruthy();
    expect(screen.getByRole('img', { name: /Cash on hand/ })).toBeTruthy();
  });

  it('renders no attainment bar when there is no target', () => {
    const { container } = render(<StatTile label="Manpower" value="1.240" />);
    expect(container.querySelector('[data-slot="stat-attainment"]')).toBeNull();
  });

  it('marks a failing target with the warning bar', () => {
    const { container } = render(<StatTile label="DSO" value="54 d" attainmentPct={18.4} meetsTarget={false} />);
    const bar = container.querySelector('[data-slot="stat-attainment"]')!;
    expect(bar.className).toContain('bg-warning-700');
  });
});

describe('MiniStat', () => {
  it('renders label, value and context', () => {
    render(<MiniStat label="DSO" value="54 d" context="target ≤ 45 d" />);
    expect(screen.getByText('54 d')).toBeTruthy();
    expect(screen.getByText('target ≤ 45 d')).toBeTruthy();
  });
});

describe('SectionBand', () => {
  it('renders the name, count and children', () => {
    render(
      <SectionBand name="Attention" count="12 open">
        <p>content</p>
      </SectionBand>,
    );
    expect(screen.getByRole('heading', { name: 'Attention' })).toBeTruthy();
    expect(screen.getByText('12 open')).toBeTruthy();
    expect(screen.getByText('content')).toBeTruthy();
  });
});

const items: ExceptionItem[] = [
  { key: 'a', severity: 'HIGH', type: 'Approval SLA', documentCode: 'PO-1', domain: 'Procurement', ageDays: 9, slaDays: 5, overdue: true, to: '/approvals' },
  { key: 'b', severity: 'MEDIUM', type: 'NCR overdue', documentCode: 'NCR-1', domain: 'Quality', ageDays: 12, slaDays: 14, overdue: false, to: '/quality' },
  { key: 'c', severity: 'LOW', type: 'Claim DRAFT', domain: 'Finance', ageDays: 3, slaDays: 30, overdue: false, to: '/finance' },
];

describe('severityBreakdown', () => {
  it('counts each severity and the total', () => {
    expect(severityBreakdown(items)).toEqual({ HIGH: 1, MEDIUM: 1, LOW: 1, total: 3 });
  });

  it('handles an empty list', () => {
    expect(severityBreakdown([])).toEqual({ HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 });
  });
});

describe('ExceptionQueue', () => {
  it('renders one row per item with severity, document and age', () => {
    render(<ExceptionQueue items={items} />);
    expect(screen.getByText('Approval SLA')).toBeTruthy();
    expect(screen.getByText('PO-1')).toBeTruthy();
    expect(screen.getAllByText(/^\d+d$/)).toHaveLength(3);
  });

  it('renders an SLA bar per row with an accessible label', () => {
    render(<ExceptionQueue items={items} />);
    expect(screen.getByRole('img', { name: /age 9 of 5 day SLA/ })).toBeTruthy();
  });

  it('shows an empty message when there is nothing to triage', () => {
    render(<ExceptionQueue items={[]} emptyMessage="No open exceptions." />);
    expect(screen.getByText('No open exceptions.')).toBeTruthy();
  });

  it('renders each row through renderRow so drill-through can be a real link', () => {
    render(<ExceptionQueue items={items} renderRow={(item, content) => <a href={item.to}>{content}</a>} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]?.getAttribute('href')).toBe('/approvals');
  });
});
