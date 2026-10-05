import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sparkline } from '@aec/ui';

describe('Sparkline', () => {
  it('exposes an accessible label with the value range', () => {
    render(<Sparkline values={[3, 5, 4, 8]} label="Burn" />);
    const el = screen.getByRole('img', { name: /Burn: 3.8/ });
    expect(el.getAttribute('aria-label')).toContain('8');
  });

  it('renders a polyline for multiple points', () => {
    const { container } = render(<Sparkline values={[1, 2, 3]} label="X" />);
    expect(container.querySelector('polyline')).toBeTruthy();
  });

  it('renders nothing (no polyline) for a single point', () => {
    const { container } = render(<Sparkline values={[1]} label="X" />);
    expect(container.querySelector('polyline')).toBeNull();
  });

  it('handles all-equal values without dividing by zero', () => {
    const { container } = render(<Sparkline values={[5, 5, 5]} label="Flat" />);
    expect(container.querySelector('polyline')).toBeTruthy();
  });

  it('renders a zero baseline line when baseline is 0', () => {
    const { container } = render(<Sparkline values={[3, -5, 4]} label="Net" baseline={0} />);
    expect(container.querySelector('[data-slot="sparkline-baseline"]')).toBeTruthy();
  });

  it('renders no baseline line by default', () => {
    const { container } = render(<Sparkline values={[3, 5, 4]} label="Burn" />);
    expect(container.querySelector('[data-slot="sparkline-baseline"]')).toBeNull();
  });

  it('keeps the zero line inside the plot when values straddle zero', () => {
    const { container } = render(<Sparkline values={[10, -10]} label="Net" baseline={0} height={28} />);
    const line = container.querySelector('[data-slot="sparkline-baseline"]')!;
    const y = Number(line.getAttribute('y1'));
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(28);
  });
});
