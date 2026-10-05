import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div />,
}));
vi.mock('./sidebar-nav', () => ({ SidebarNav: () => <div data-testid="sidebar-nav" /> }));
vi.mock('./topbar-breadcrumb', () => ({ TopbarBreadcrumb: () => <div /> }));
vi.mock('./user-menu', () => ({ UserMenu: () => <div /> }));

import { AppShell } from './app-shell';

describe('AppShell brand header', () => {
  it('renders the logo image and the "AEC" wordmark', () => {
    const { container } = render(<AppShell />);
    const logo = container.querySelectorAll('img[src="/logo-mark.png"]');
    expect(logo.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AEC').length).toBeGreaterThanOrEqual(1);
  });

  it('uses an h-12 brand header so the border lines up with the topbar', () => {
    const { container } = render(<AppShell />);
    const header = container.querySelector('[data-slot="brand-header"]');
    expect(header?.className).toContain('h-12');
  });
});
