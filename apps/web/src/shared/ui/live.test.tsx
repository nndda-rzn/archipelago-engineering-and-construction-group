import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LiveValue } from './live-value';
import { LiveIndicator, updatedAgo } from './live-indicator';

describe('LiveValue', () => {
  beforeEach(() => {
    // Matikan animasi agar nilai langsung final di test.
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the formatted value', () => {
    render(<LiveValue value={1234} format={(n) => `Rp ${Math.round(n)}`} />);
    expect(screen.getByText('Rp 1234')).toBeTruthy();
  });

  it('updates the displayed value when the value changes', async () => {
    const { rerender } = render(<LiveValue value={100} format={(n) => `Rp ${Math.round(n)}`} />);
    expect(screen.getByText('Rp 100')).toBeTruthy();
    act(() => rerender(<LiveValue value={250} format={(n) => `Rp ${Math.round(n)}`} />));
    // Reduced-motion path (matchMedia true) menetapkan nilai pada frame berikutnya.
    await vi.waitFor(() => expect(screen.getByText('Rp 250')).toBeTruthy());
  });
});

describe('updatedAgo', () => {
  it('reports live when there is no change yet', () => {
    expect(updatedAgo(null, 1000)).toBe('live');
  });
  it('reports just now for a very recent change', () => {
    expect(updatedAgo(1000, 2000)).toBe('updated just now');
  });
  it('reports seconds', () => {
    expect(updatedAgo(0, 12_000)).toBe('updated 12s ago');
  });
  it('reports minutes', () => {
    expect(updatedAgo(0, 130_000)).toBe('updated 2m ago');
  });
});

describe('LiveIndicator', () => {
  it('shows offline when disconnected', () => {
    render(<LiveIndicator connected={false} lastChangeAt={null} now={0} />);
    expect(screen.getByText('offline')).toBeTruthy();
  });
  it('shows the updated text when connected', () => {
    render(<LiveIndicator connected lastChangeAt={0} now={12_000} />);
    expect(screen.getByText('updated 12s ago')).toBeTruthy();
  });
});
