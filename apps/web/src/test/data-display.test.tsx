import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignalChip, BulletBar, MiniStackedBar, StackedBar, ScaleBar } from '@aec/ui';

describe('SignalChip', () => {
  it('renders count, label and context with a hidden severity dot', () => {
    const { container } = render(<SignalChip severity="high" count={3} label="Anomalies" context="needs review" />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('Anomalies')).toBeTruthy();
    expect(screen.getByText('needs review')).toBeTruthy();
    expect(container.querySelector('[data-slot="signal-dot"]')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('BulletBar', () => {
  it('exposes an accessible label with the percentage', () => {
    render(<BulletBar value={68} max={100} label="Utilization" />);
    expect(screen.getByRole('img', { name: /Utilization: 68%/ })).toBeTruthy();
  });

  it('clamps percentage to 100 when value exceeds max', () => {
    render(<BulletBar value={150} max={100} label="Usage" />);
    expect(screen.getByRole('img', { name: /Usage: 100%/ })).toBeTruthy();
  });

  it('defaults to the brand tone (existing callers unchanged)', () => {
    const { container } = render(<BulletBar value={50} max={100} label="Default" />);
    const fill = container.querySelector('[data-slot="bullet-fill"]');
    expect(fill?.className).toContain('bg-racing-red-600');
  });

  it('honours an explicit tone so red is reserved for attention/action', () => {
    const { container } = render(<BulletBar value={50} max={100} label="Neutral" tone="neutral" />);
    const fill = container.querySelector('[data-slot="bullet-fill"]');
    expect(fill?.className).toContain('bg-neutral-400');
    expect(fill?.className).not.toContain('racing-red');
  });
});

describe('StackedBar', () => {
  it('exposes every segment value in the accessible label (not colour alone)', () => {
    render(
      <StackedBar
        segments={[
          { value: 150, tone: 'neutral-mid', label: 'Committed' },
          { value: 30, tone: 'neutral-dark', label: 'This request' },
          { value: 570, tone: 'neutral-light', label: 'Remaining' },
        ]}
      />,
    );
    expect(screen.getByRole('img', { name: /Committed 150, This request 30, Remaining 570/ })).toBeTruthy();
  });

  it('renders no segments when the total is zero (no division by zero)', () => {
    const { container } = render(
      <StackedBar segments={[{ value: 0, tone: 'neutral-dark', label: 'Empty' }]} />,
    );
    expect(container.querySelectorAll('[data-slot="stacked-segment"]').length).toBe(0);
  });
});

describe('MiniStackedBar', () => {
  it('exposes both segments in the accessible label', () => {
    render(<MiniStackedBar primary={80} secondary={20} label="Budget vs Actual" />);
    expect(screen.getByRole('img', { name: /Budget vs Actual: 80 \/ 20/ })).toBeTruthy();
  });
});

describe('ScaleBar', () => {
  it('exposes an accessible label with the percentage', () => {
    render(<ScaleBar value={68} max={100} label="Contribution" />);
    expect(screen.getByRole('img', { name: /Contribution: 68%/ })).toBeTruthy();
  });

  it('clamps the fill to 100% when value exceeds max', () => {
    render(<ScaleBar value={150} max={100} label="Usage" />);
    expect(screen.getByRole('img', { name: /Usage: 100%/ })).toBeTruthy();
  });

  it('treats a zero max as an empty bar (no division by zero)', () => {
    render(<ScaleBar value={10} max={0} label="Empty" />);
    expect(screen.getByRole('img', { name: /Empty: 0%/ })).toBeTruthy();
  });

  it('renders the fill as a gradient (a scale, not a flat colour)', () => {
    const { container } = render(<ScaleBar value={50} max={100} label="Gradient" />);
    const fill = container.querySelector('[data-slot="scale-fill"]') as HTMLElement;
    expect(fill.style.background).toContain('gradient');
  });

  it('changes the gradient stops by sign tone', () => {
    const { container: pos } = render(<ScaleBar value={80} max={100} label="Up" tone="positive" />);
    const { container: neg } = render(<ScaleBar value={80} max={100} label="Down" tone="negative" />);
    const posFill = pos.querySelector('[data-slot="scale-fill"]') as HTMLElement;
    const negFill = neg.querySelector('[data-slot="scale-fill"]') as HTMLElement;
    expect(posFill.style.background).not.toBe(negFill.style.background);
    expect(posFill.style.background).toContain('success');
    expect(negFill.style.background).toContain('destructive');
  });

  it('defaults to a neutral gradient', () => {
    const { container } = render(<ScaleBar value={50} max={100} label="Neutral" />);
    const fill = container.querySelector('[data-slot="scale-fill"]') as HTMLElement;
    expect(fill.style.background).toContain('neutral');
  });
});
