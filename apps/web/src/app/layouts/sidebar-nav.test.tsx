import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// State yang bisa diubah per-test; `vi.hoisted` agar tersedia sebelum import.
const state = vi.hoisted(() => ({ path: '/', pendingCount: undefined as number | undefined, permissions: undefined as string[] | undefined }));

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

// Sidebar kini menyaring menu lewat permission. Default: semua izin dianggap ada
// (semua item tampil), sehingga test struktur/state identik dengan sebelum gating.
// Test gating men-set `state.permissions` untuk menyimulasikan role tertentu.
vi.mock('@/entities/session', () => ({
  usePermissions: () => ({
    set: new Set(state.permissions ?? []),
    can: (code: string) => state.permissions === undefined || state.permissions.includes(code),
    canAny: (codes: string[]) => state.permissions === undefined || codes.some((c) => state.permissions!.includes(c)),
  }),
}));

import { SidebarNav, resolveOpenNodes, scrollActiveIntoView } from './sidebar-nav';
import { allNavItems, matchNav, navGroups, nodeKey } from './nav-config';

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
    state.permissions = undefined;
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

describe('pohon tersambung (garis pemandu)', () => {
  beforeEach(() => {
    localStorage.clear();
    state.pendingCount = undefined;
    Element.prototype.scrollIntoView = vi.fn();
  });

  /** Leluhur ber-positioning — syarat agar `absolute` tidak lolos ke viewport. */
  function hasPositionedAncestorWithinNav(el: Element, nav: Element): boolean {
    let node: Element | null = el.parentElement;
    while (node && node !== nav) {
      const style = node.getAttribute('class') ?? '';
      if (/\b(relative|absolute|fixed|sticky)\b/.test(style)) return true;
      node = node.parentElement;
    }
    return false;
  }

  it('setiap garis punya leluhur ber-positioning di dalam nav (tidak lolos ke viewport)', () => {
    state.path = '/'; // Construction & HCM terbuka (default) → subgrup + item ter-render
    const { container } = render(<SidebarNav onNavigate={() => {}} />);
    const nav = container.querySelector('nav');
    expect(nav).not.toBeNull();
    const guides = Array.from(container.querySelectorAll('[data-tree-guide]'));
    expect(guides.length).toBeGreaterThan(0);
    for (const guide of guides) {
      expect(
        hasPositionedAncestorWithinNav(guide, nav as Element),
        `garis tanpa leluhur relative: ${guide.getAttribute('class')}`,
      ).toBe(true);
    }
  });

  /** Baris pemilik garis (garis kini di luar `<a>`, jadi tak ikut tersorot). */
  const rowOf = (link: HTMLElement) => link.closest('[data-nav-row]') as HTMLElement;

  it('menempatkan garis di luar <a> agar tidak ikut tersorot saat diklik', () => {
    state.path = '/';
    render(<SidebarNav onNavigate={() => {}} />);
    const wp = screen.getByRole('link', { name: 'Work Packages' });
    // Inti permintaan: elemen yang bisa diklik tidak boleh memuat garis tree.
    expect(wp.querySelectorAll('[data-tree-guide]').length).toBe(0);
    // Tapi garisnya tetap ada, di baris yang sama.
    expect(rowOf(wp).querySelectorAll('[data-tree-guide]').length).toBeGreaterThan(0);
  });

  it('memberi batang + stub pada baris item, dan batang pada header subgrup', () => {
    state.path = '/';
    render(<SidebarNav onNavigate={() => {}} />);
    // Subgrup Construction harus punya batang turun ke anaknya
    const construction = screen.getByRole('button', { name: 'Construction' });
    expect(construction.querySelector('[data-tree-guide="trunk-bottom"]')).not.toBeNull();
    // Item di dalamnya punya batang penuh + stub horizontal
    const wp = rowOf(screen.getByRole('link', { name: 'Work Packages' }));
    expect(wp.querySelector('[data-tree-guide="trunk-top"]')).not.toBeNull();
    expect(wp.querySelector('[data-tree-guide="stub"]')).not.toBeNull();
  });

  it('anak terakhir tidak menggambar batang ke bawah (elbow └─)', () => {
    state.path = '/';
    render(<SidebarNav onNavigate={() => {}} />);
    const handover = rowOf(screen.getByRole('link', { name: 'Handover' })); // anak terakhir Construction
    expect(handover.querySelector('[data-tree-guide="trunk-bottom"]')).toBeNull();
    const wp = rowOf(screen.getByRole('link', { name: 'Work Packages' })); // bukan terakhir
    expect(wp.querySelector('[data-tree-guide="trunk-bottom"]')).not.toBeNull();
  });

  it('menggambar garis leluhur penuh pada item agar batang level-1 tidak putus', () => {
    state.path = '/';
    render(<SidebarNav onNavigate={() => {}} />);
    const wp = rowOf(screen.getByRole('link', { name: 'Work Packages' }));
    const full = wp.querySelector('[data-tree-guide="full"]');
    expect(full).not.toBeNull();
    // garis leluhur berada di kolom subgrup (left-5), bukan kolom item (left-8)
    expect(full?.className).toContain('left-5');
    expect(full?.className).toContain('inset-y-0');
  });

  it('meneruskan batang level-1 melewati subgrup yang bukan terakhir', () => {
    state.path = '/';
    render(<SidebarNav onNavigate={() => {}} />);
    const construction = screen.getByRole('button', { name: 'Construction' });
    // Construction bukan subgrup terakhir (ada HCM) → wajib punya batang bawah di x=5
    const bottoms = Array.from(construction.querySelectorAll('[data-tree-guide="trunk-bottom"]')).map((g) => g.className);
    expect(bottoms.some((c) => c.includes('left-5'))).toBe(true);
  });

  it('tidak meneruskan batang level-1 pada subgrup terakhir', () => {
    state.path = '/';
    render(<SidebarNav onNavigate={() => {}} />);
    const hcm = screen.getByRole('button', { name: 'HCM' });
    const bottoms = Array.from(hcm.querySelectorAll('[data-tree-guide="trunk-bottom"]')).map((g) => g.className);
    expect(bottoms.some((c) => c.includes('left-5'))).toBe(false);
  });

  it('menyambung batang dari header grup ke anaknya', () => {
    state.path = '/';
    render(<SidebarNav onNavigate={() => {}} />);
    // Project & Engineering adalah grup flat (tanpa subgrup) → header harus punya batang turun
    const header = screen.getByRole('button', { name: 'Project & Engineering' });
    expect(header.querySelector('[data-tree-guide="trunk-bottom"]')).not.toBeNull();
  });

  it('menyelaraskan batang subgrup dengan batang item anaknya (tidak patah)', () => {
    state.path = '/';
    render(<SidebarNav onNavigate={() => {}} />);
    const construction = screen.getByRole('button', { name: 'Construction' });
    const child = rowOf(screen.getByRole('link', { name: 'Work Packages' }));
    const subBottoms = Array.from(construction.querySelectorAll('[data-tree-guide="trunk-bottom"]')).map((g) => g.className);
    const childTrunk = child.querySelector('[data-tree-guide="trunk-top"]');
    expect(childTrunk).not.toBeNull();
    // Subgrup harus menggambar batang turun di kolom anaknya (left-8), bukan hanya left-5.
    expect(subBottoms.some((c) => c.includes('left-8'))).toBe(true);
    expect(childTrunk?.className).toContain('left-8');
  });

  it('menyelaraskan batang header grup dengan batang item grup flat', () => {
    state.path = '/';
    render(<SidebarNav onNavigate={() => {}} />);
    const header = screen.getByRole('button', { name: 'Project & Engineering' });
    const child = rowOf(screen.getByRole('link', { name: 'Projects' }));
    expect(header.querySelector('[data-tree-guide="trunk-bottom"]')?.className).toContain('left-5');
    expect(child.querySelector('[data-tree-guide="trunk-top"]')?.className).toContain('left-5');
  });

  it('garis tree selalu netral (tidak menyala saat item aktif)', () => {
    state.path = '/finance/journals';
    const { container } = render(<SidebarNav onNavigate={() => {}} />);
    const guides = Array.from(container.querySelectorAll('[data-tree-guide]'));
    expect(guides.length).toBeGreaterThan(0);
    for (const guide of guides) {
      expect(guide.className).toContain('bg-neutral-200');
      expect(guide.className).not.toContain('bg-neutral-900');
    }
  });
});

describe('satu item aktif saja (tidak double highlight)', () => {
  beforeEach(() => {
    localStorage.clear();
    state.pendingCount = undefined;
    state.permissions = undefined;
    Element.prototype.scrollIntoView = vi.fn();
  });

  const activeLinks = () =>
    screen.queryAllByRole('link').filter((el) => el.getAttribute('aria-current') === 'page');

  it('route bersarang /analytics/reporting hanya menandai Advanced Reporting', () => {
    state.path = '/analytics/reporting';
    render(<SidebarNav onNavigate={() => {}} />);
    const active = activeLinks();
    expect(active).toHaveLength(1);
    expect(active[0]?.textContent?.trim()).toBe('Advanced Reporting');
  });

  it('route bersarang /commercial/tender hanya menandai Tender & Bid', () => {
    state.path = '/commercial/tender';
    render(<SidebarNav onNavigate={() => {}} />);
    const active = activeLinks();
    expect(active).toHaveLength(1);
    expect(active[0]?.textContent?.trim()).toBe('Tender & Bid');
  });

  it('route induk /analytics tetap menandai Executive Analytics', () => {
    state.path = '/analytics';
    render(<SidebarNav onNavigate={() => {}} />);
    const active = activeLinks();
    expect(active).toHaveLength(1);
    expect(active[0]?.textContent?.trim()).toBe('Executive Analytics');
  });

  it('SETIAP route nav dipetakan matchNav ke tepat dirinya sendiri (invarian 52 route)', () => {
    // Sumber kebenaran highlight adalah `matchNav` (dipakai juga breadcrumb).
    // Diuji murni — bukan dengan merender 52x — agar cepat dan tidak flaky di CI.
    for (const item of allNavItems()) {
      expect(matchNav(item.to)?.to, `route ${item.to}`).toBe(item.to);
    }
  });

  it('menyembunyikan menu yang permission-nya tidak dimiliki user (mis. Buyer)', () => {
    // Hanya izin Buyer yang dipegang; menu lain harus benar-benar hilang.
    state.permissions = ['Project.VIEW', 'WBS.VIEW', 'PurchaseRequisition.VIEW', 'PurchaseOrder.VIEW', 'Approval.VIEW'];
    state.path = '/';
    render(<SidebarNav onNavigate={() => {}} />);

    const labels = screen.queryAllByRole('link').map((el) => el.textContent?.trim());
    // Item level-1 yang boleh: Dashboard, Approval (Procurement tertutup default).
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Approval');
    // Menu yang tidak diizinkan hilang, bukan disabled.
    expect(labels).not.toContain('Executive Analytics');
    expect(labels).not.toContain('User Management');
    // Grup tanpa satu pun item yang boleh tidak dirender sama sekali.
    expect(screen.queryByRole('button', { name: 'Finance & Treasury' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Foundation' })).toBeNull();
  });

  it('komponen menandai tepat satu item untuk route perwakilan (rerender, bukan mount ulang)', () => {
    // Route perwakilan: kedua pasangan bersarang + beberapa grup/subgrup, tanpa
    // merender 52x agar tidak menyentuh timeout di CI.
    const routes = ['/', '/analytics', '/analytics/reporting', '/commercial', '/commercial/tender', '/projects', '/procurement/pr', '/finance/journals', '/hcm/payroll', '/hse'];
    state.path = '/';
    const { rerender } = render(<SidebarNav onNavigate={() => {}} />);
    for (const route of routes) {
      state.path = route;
      rerender(<SidebarNav onNavigate={() => {}} />);
      const active = screen.queryAllByRole('link').filter((el) => el.getAttribute('aria-current') === 'page');
      expect(active.length, `route ${route} menandai ${active.length} item`).toBe(1);
    }
  }, 15000);
});
