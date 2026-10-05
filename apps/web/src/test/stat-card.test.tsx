import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@aec/ui';

describe('StatCard', () => {
  it('renders label, value and context', () => {
    render(<StatCard label="Budget" value="Rp 1.000" context="82% of budget" />);
    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.getByText('Rp 1.000')).toBeTruthy();
    expect(screen.getByText('82% of budget')).toBeTruthy();
  });

  it('renders delta with an accessible direction label', () => {
    render(<StatCard label="Cash" value="Rp 5" delta={{ value: '+12%', direction: 'up' }} />);
    expect(screen.getByText('+12%')).toBeTruthy();
    expect(screen.getByLabelText('up')).toBeTruthy();
  });

  it('renders no delta element when delta is absent', () => {
    const { container } = render(<StatCard label="X" value="1" />);
    expect(container.querySelector('[data-slot="stat-delta"]')).toBeNull();
  });
});
