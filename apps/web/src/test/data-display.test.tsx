import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignalChip, BulletBar, MiniStackedBar } from '@aec/ui';

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
});

describe('MiniStackedBar', () => {
  it('exposes both segments in the accessible label', () => {
    render(<MiniStackedBar primary={80} secondary={20} label="Budget vs Actual" />);
    expect(screen.getByRole('img', { name: /Budget vs Actual: 80 \/ 20/ })).toBeTruthy();
  });
});
