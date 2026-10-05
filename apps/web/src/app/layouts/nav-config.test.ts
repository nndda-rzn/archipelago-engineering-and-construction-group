import { describe, expect, it } from 'vitest';
import { allNavItems, isActiveRoute, matchNav, navGroups, type NavGroup } from './nav-config';

/** Semua leaf item dari sebuah grup (baik grup flat maupun bergrup-nested). */
function leavesOf(group: NavGroup) {
  return group.subgroups ? group.subgroups.flatMap((s) => s.items) : (group.items ?? []);
}

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

  it('mempertahankan 52 leaf item (invarian dari struktur sebelumnya)', () => {
    const total = navGroups.reduce((sum, g) => sum + leavesOf(g).length, 0);
    expect(total).toBe(52);
  });

  it('setiap grup punya ikon', () => {
    for (const group of navGroups) {
      expect(group.icon, `grup ${group.label} tanpa ikon`).toBeTruthy();
    }
  });

  it('tidak ada route ganda antar grup', () => {
    const routes = allNavItems().map((i) => i.to);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('Finance & Treasury dan Procurement & Inventory default collapsed', () => {
    const collapsedLabels = navGroups.filter((g) => g.defaultCollapsed).map((g) => g.label);
    expect(collapsedLabels).toEqual(['Procurement & Inventory', 'Finance & Treasury']);
  });

  it('setiap leaf punya label dan route non-kosong', () => {
    for (const item of allNavItems()) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.to.startsWith('/')).toBe(true);
    }
  });
});

describe('struktur 3 level', () => {
  it('hanya 3 grup yang punya subgrup', () => {
    const nested = navGroups.filter((g) => g.subgroups).map((g) => g.label);
    expect(nested).toEqual(['Procurement & Inventory', 'Finance & Treasury', 'Construction & HCM']);
  });

  it('grup tanpa subgrup punya items langsung', () => {
    for (const group of navGroups) {
      if (group.subgroups) {
        expect(group.items, `${group.label} punya subgroups sekaligus items`).toBeUndefined();
      } else {
        expect(group.items?.length, `${group.label} tanpa items`).toBeGreaterThan(0);
      }
    }
  });

  it('Procurement & Inventory terbagi Procurement + Inventory', () => {
    const group = navGroups.find((g) => g.label === 'Procurement & Inventory');
    expect(group?.subgroups?.map((s) => s.label)).toEqual(['Procurement', 'Inventory']);
    expect(group?.subgroups?.map((s) => s.items.length)).toEqual([4, 6]);
  });

  it('Finance & Treasury terbagi Receivable + Payable + Accounting + Treasury', () => {
    const group = navGroups.find((g) => g.label === 'Finance & Treasury');
    expect(group?.subgroups?.map((s) => s.label)).toEqual(['Receivable', 'Payable', 'Accounting', 'Treasury']);
    expect(group?.subgroups?.map((s) => s.items.length)).toEqual([3, 4, 4, 1]);
  });

  it('Construction & HCM terbagi Construction + HCM', () => {
    const group = navGroups.find((g) => g.label === 'Construction & HCM');
    expect(group?.subgroups?.map((s) => s.label)).toEqual(['Construction', 'HCM']);
    expect(group?.subgroups?.map((s) => s.items.length)).toEqual([4, 4]);
  });

  it('tidak ada label subgrup yang bertabrakan dengan label grup', () => {
    const groupLabels = new Set(navGroups.map((g) => g.label));
    for (const group of navGroups) {
      for (const sub of group.subgroups ?? []) {
        expect(groupLabels.has(sub.label), `subgrup "${sub.label}" bertabrakan dengan nama grup`).toBe(false);
      }
    }
  });
});

describe('allNavItems', () => {
  it('meratakan seluruh leaf beserta nama grupnya', () => {
    const items = allNavItems();
    expect(items).toHaveLength(52);
    expect(items.every((i) => i.group.length > 0)).toBe(true);
  });

  it('menyertakan nama subgrup bila item berada di dalam subgrup', () => {
    const pr = allNavItems().find((i) => i.label === 'Purchase Requisition');
    expect(pr?.group).toBe('Procurement & Inventory');
    expect(pr?.subgroup).toBe('Procurement');
  });

  it('item grup flat tidak punya subgroup', () => {
    const dash = allNavItems().find((i) => i.label === 'Dashboard');
    expect(dash?.group).toBe('Main');
    expect(dash?.subgroup).toBeUndefined();
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

  it('mengembalikan subgroup untuk item bertingkat', () => {
    const match = matchNav('/finance/journals');
    expect(match?.group).toBe('Finance & Treasury');
    expect(match?.subgroup).toBe('Accounting');
    expect(match?.label).toBe('GL Journal');
  });

  it('cocok untuk sub-path dinamis (detail)', () => {
    expect(matchNav('/finance/vendor-invoices/abc')?.to).toBe('/finance/vendor-invoices');
  });

  it('mengembalikan null untuk route tak terdaftar', () => {
    expect(matchNav('/tidak-ada-halaman')).toBeNull();
  });
});
