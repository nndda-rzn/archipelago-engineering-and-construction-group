import { describe, expect, it } from 'vitest';
import { allNavItems, isActiveRoute, matchNav, navGroups } from './nav-config';

describe('navGroups', () => {
  it('memiliki 8 grup sesuai keputusan 2026-09-26', () => {
    expect(navGroups).toHaveLength(8);
    expect(navGroups.map((g) => g.label)).toEqual([
      'Main',
      'Foundation',
      'Project & Engineering',
      'Commercial & Tender',
      'Procurement & Inventory',
      'Finance & Treasury',
      'Construction & HCM',
      'Governance',
    ]);
  });

  it('mempertahankan jumlah item (52) dari struktur sebelumnya', () => {
    const total = navGroups.reduce((sum, g) => sum + g.items.length, 0);
    expect(total).toBe(52);
  });

  it('tidak ada route ganda antar grup', () => {
    const routes = navGroups.flatMap((g) => g.items.map((i) => i.to));
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('Finance & Treasury dan Procurement & Inventory default collapsed', () => {
    const collapsedLabels = navGroups.filter((g) => g.defaultCollapsed).map((g) => g.label);
    expect(collapsedLabels).toEqual(['Procurement & Inventory', 'Finance & Treasury']);
  });

  it('setiap item punya label dan route non-kosong', () => {
    for (const group of navGroups) {
      for (const item of group.items) {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.to.startsWith('/')).toBe(true);
      }
    }
  });
});

describe('allNavItems', () => {
  it('meratakan seluruh item dengan nama grupnya', () => {
    const items = allNavItems();
    const expected = navGroups.reduce((sum, g) => sum + g.items.length, 0);
    expect(items).toHaveLength(expected);
    expect(items.every((i) => i.group.length > 0)).toBe(true);
  });

  it('item Governance menyertakan HSE, Quality, Governance', () => {
    const gov = allNavItems().filter((i) => i.group === 'Governance').map((i) => i.label);
    expect(gov).toEqual(['HSE', 'Quality', 'Governance']);
  });
});

describe('isActiveRoute', () => {
  it('route root hanya aktif tepat di "/"', () => {
    expect(isActiveRoute('/', '/')).toBe(true);
    expect(isActiveRoute('/', '/projects')).toBe(false);
  });

  it('cocok tepat dan sebagai prefix segmen', () => {
    expect(isActiveRoute('/projects', '/projects')).toBe(true);
    expect(isActiveRoute('/projects', '/projects/123')).toBe(true);
    expect(isActiveRoute('/projects', '/project-health')).toBe(false);
  });
});

describe('matchNav', () => {
  it('memilih match paling spesifik', () => {
    expect(matchNav('/analytics/reporting')?.to).toBe('/analytics/reporting');
    expect(matchNav('/analytics/reporting')?.label).toBe('Advanced Reporting');
  });

  it('mengembalikan grup dan label untuk dashboard', () => {
    const match = matchNav('/');
    expect(match?.group).toBe('Main');
    expect(match?.label).toBe('Dashboard');
  });

  it('cocok untuk sub-path dinamis (detail)', () => {
    expect(matchNav('/finance/vendor-invoices/abc')?.to).toBe('/finance/vendor-invoices');
  });

  it('mengembalikan null untuk route tak terdaftar', () => {
    expect(matchNav('/tidak-ada-halaman')).toBeNull();
  });
});
