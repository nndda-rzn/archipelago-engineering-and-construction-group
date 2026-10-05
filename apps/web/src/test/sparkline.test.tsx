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
});
