import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const state = vi.hoisted(() => ({ from: '' }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>{children}</a>
  ),
}));

vi.mock('@/shared/lib/use-url-state', () => ({
  useUrlFilter: () => [state.from, () => {}],
}));

import { AccessDeniedPage } from './access-denied.page';

describe('AccessDeniedPage', () => {
  it('states the denial and names the page that was refused', () => {
    state.from = '/analytics';
    render(<AccessDeniedPage />);
    expect(screen.getByText('Access denied')).toBeTruthy();
    expect(screen.getByText(/permission to view \/analytics/i)).toBeTruthy();
  });

  it('offers a way back to the dashboard', () => {
    state.from = '';
    render(<AccessDeniedPage />);
    const back = screen.getByRole('link', { name: /back to dashboard/i });
    expect(back.getAttribute('href')).toBe('/');
  });
});
