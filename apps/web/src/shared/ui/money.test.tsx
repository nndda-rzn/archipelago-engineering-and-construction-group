import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Money } from './money';

describe('Money', () => {
  it('shows the compact form and exposes the full value via title', () => {
    render(<Money value={6_246_138_966_310} />);
    const el = screen.getByText('Rp 6,25 T');
    expect(el.getAttribute('title')).toMatch(/Rp\s?6\.246\.138\.966\.310/);
  });

  it('renders the compact value as its own text', () => {
    render(<Money value={40_150_000_000} />);
    expect(screen.getByText('Rp 40,15 M')).toBeTruthy();
  });

  it('applies the provided className for tone', () => {
    render(<Money value={-1_000_000} className="text-destructive-600" />);
    expect(screen.getByText('−Rp 1 jt').className).toContain('text-destructive-600');
  });
});
