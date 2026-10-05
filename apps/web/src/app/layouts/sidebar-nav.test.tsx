import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// State yang bisa diubah per-test; `vi.hoisted` agar tersedia sebelum import.
const state = vi.hoisted(() => ({ path: '/', pendingCount: undefined as number | undefined }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children: ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: state.path }),
}));

vi.mock('@/features/analytics/model/analytics.api', () => ({
  usePendingApprovals: () => ({ data: state.pendingCount === undefined ? undefined : { count: state.pendingCount } }),
}));

import { SidebarNav, resolveOpenNodes, scrollActiveIntoView } from './sidebar-nav';
import { navGroups, nodeKey } from './nav-config';

describe('resolveOpenNodes', () => {
  const saved = { 'Finance & Treasury': false, 'Procurement & Inventory': false };

  it('memaksa terbuka grup yang memuat route aktif, mengalahkan state tersimpan', () => {
    const open = resolveOpenNodes('/finance/journals', saved);
    expect(open['Finance & Treasury']).toBe(true);
  });

  it('memaksa terbuka subgrup yang memuat route aktif walau state tersimpan bilang tertutup', () => {
    const open = resolveOpenNodes('/finance/journals', { 'Finance & Treasury/Accounting': false });
    expect(open[nodeKey('Finance & Treasury', 'Accounting')]).toBe(true);
  });

  it('membiarkan subgrup lain mengikuti state tersimpan saat ada route aktif di saudaranya', () => {
    const open = resolveOpenNodes('/finance/journals', { 'Finance & Treasury/Accounting': false, 'Finance & Treasury/Payable': false });
    expect(open[nodeKey('Finance & Treasury', 'Payable')]).toBe(false);
  });

  it('menghormati state tersimpan untuk grup tanpa route aktif', () => {
    const open = resolveOpenNodes('/projects', saved);
    expect(open['Finance & Treasury']).toBe(false);
    expect(open['Procurement & Inventory']).toBe(false);
  });

  it('jatuh ke defaultCollapsed bila tak ada state tersimpan', () => {
    const open = resolveOpenNodes('/projects', {});
    expect(open['Finance & Treasury']).toBe(false);
    expect(open['Construction & HCM']).toBe(true);
    expect(open['Main']).toBe(true);
  });

  it('menghormati state tersimpan eksplisit (terbuka)', () => {
    const open = resolveOpenNodes('/projects', { 'Finance & Treasury': true });
    expect(open['Finance & Treasury']).toBe(true);
  });

  it('membuat kunci untuk setiap node (grup + subgrup)', () => {
    const expected = navGroups.reduce((n, g) => n + 1 + (g.subgroups?.length ?? 0), 0);
    expect(Object.keys(resolveOpenNodes('/', {}))).toHaveLength(expected);
  });
});

describe('scrollActiveIntoView', () => {
  it('menggulir elemen aktif ke viewport', () => {
    const el = { scrollIntoView: vi.fn() } as unknown as HTMLElement;
    const container = { querySelector: vi.fn(() => el) } as unknown as ParentNode;
    scrollActiveIntoView(container);
    expect(el.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('tidak error bila tidak ada elemen aktif', () => {
    const container = { querySelector: vi.fn(() => null) } as unknown as ParentNode;
    expect(() => scrollActiveIntoView(container)).not.toThrow();
  });
});

describe('SidebarNav rendering', () => {
  beforeEach(() => {
    localStorage.clear();
    state.pendingCount = undefined;
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('menandai link aktif dengan aria-current="page"', () => {
    state.path = '/projects';
    render(<SidebarNav onNavigate={() => {}} />);
    expect(screen.getByRole('link', { name: 'Projects' }).getAttribute('aria-current')).toBe('page');
  });

  it('menampilkan ikon di setiap header grup', () => {
    state.path = '/';
    const { container } = render(<SidebarNav onNavigate={() => {}} />);
    for (const group of navGroups) {
      const trigger = screen.getByRole('button', { name: group.label });
      expect(trigger.querySelector('svg'), `header ${group.label} tanpa ikon`).not.toBeNull();
    }
    expect(container.querySelectorAll('nav svg').length).toBeGreaterThanOrEqual(navGroups.length);
  });

  it('membuka paksa grup DAN subgrup yang memuat route aktif', () => {
    state.path = '/finance/journals';
    render(<SidebarNav onNavigate={() => {}} />);
    expect(screen.getByRole('button', { name: 'Finance & Treasury' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Accounting' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('link', { name: 'GL Journal' }).getAttribute('aria-current')).toBe('page');
  });

  it('membiarkan grup default-collapsed tetap tertutup bila tanpa route aktif', () => {
    state.path = '/projects';
    render(<SidebarNav onNavigate={() => {}} />);
    expect(screen.getByRole('button', { name: 'Finance & Treasury' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('merender garis pemandu tree (bukan pseudo-element)', () => {
    state.path = '/';
    const { container } = render(<SidebarNav onNavigate={() => {}} />);
    expect(container.querySelectorAll('[data-tree-guide]').length).toBeGreaterThan(0);
  });

  it('menampilkan badge Approval dari data nyata saat count > 0', () => {
    state.path = '/';
    state.pendingCount = 3;
    render(<SidebarNav onNavigate={() => {}} />);
    expect(screen.getByRole('link', { name: /Approval, 3 pending/ })).toBeTruthy();
  });

  it('tidak merender badge saat count 0', () => {
    state.path = '/';
    state.pendingCount = 0;
    render(<SidebarNav onNavigate={() => {}} />);
    expect(screen.getByRole('link', { name: 'Approval' }).getAttribute('aria-label')).toBeNull();
  });

  it('tidak merender badge saat data belum tersedia', () => {
    state.path = '/';
    render(<SidebarNav onNavigate={() => {}} />);
    expect(screen.getByRole('link', { name: 'Approval' }).getAttribute('aria-label')).toBeNull();
  });

  it('menampilkan subgrup sebagai tombol yang bisa dibuka', () => {
    state.path = '/';
    render(<SidebarNav onNavigate={() => {}} />);
    expect(screen.getByRole('button', { name: 'Construction' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'HCM' })).toBeTruthy();
  });
});
