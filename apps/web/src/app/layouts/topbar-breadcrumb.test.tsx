import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const state = vi.hoisted(() => ({ path: '/' }));

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: state.path }),
}));

import { TopbarBreadcrumb } from './topbar-breadcrumb';

describe('TopbarBreadcrumb', () => {
  it('menampilkan grup › subgrup › item untuk item bertingkat', () => {
    state.path = '/finance/journals';
    render(<TopbarBreadcrumb />);
    expect(screen.getByText('Finance & Treasury')).toBeTruthy();
    expect(screen.getByText('Accounting')).toBeTruthy();
    expect(screen.getByText('GL Journal').getAttribute('aria-current')).toBe('page');
  });

  it('tetap dua tingkat untuk item grup flat', () => {
    state.path = '/projects';
    const { container } = render(<TopbarBreadcrumb />);
    expect(screen.getByText('Project & Engineering')).toBeTruthy();
    expect(screen.getByText('Projects')).toBeTruthy();
    // hanya satu pemisah untuk breadcrumb 2 tingkat
    expect(container.querySelectorAll('li').length).toBe(3);
  });

  it('tidak menampilkan apa pun untuk route tak terdaftar', () => {
    state.path = '/tidak-ada';
    const { container } = render(<TopbarBreadcrumb />);
    expect(container.querySelector('nav')).toBeNull();
  });
});
