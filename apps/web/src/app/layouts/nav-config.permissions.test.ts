import { describe, expect, it } from 'vitest';
import { Permission } from '@aec/shared-types';
import { allNavItems, navGroups, visibleNavGroups } from './nav-config';

const VALID = new Set<string>(Object.values(Permission));

describe('nav-config permissions', () => {
  it('every nav item permission is a known code (no typos, no drift)', () => {
    for (const item of allNavItems()) {
      if (item.permission) expect(VALID.has(item.permission)).toBe(true);
    }
  });

  it('every nav item declares a permission', () => {
    for (const item of allNavItems()) {
      expect(item.permission).toBeTruthy();
    }
  });
});

describe('visibleNavGroups', () => {
  const canFrom = (codes: string[]) => (code: string) => codes.includes(code);

  it('SUPER_ADMIN (all permissions) sees every group and item', () => {
    const groups = visibleNavGroups(() => true);
    expect(groups).toHaveLength(navGroups.length);
    expect(allNavItems(groups)).toHaveLength(allNavItems().length);
  });

  it('BUYER sees only the menu its permissions allow', () => {
    // Permission BUYER sesuai seed.ts.
    const buyer = [
      'Project.VIEW', 'WBS.VIEW', 'PurchaseRequisition.VIEW', 'PurchaseRequisition.CREATE',
      'PurchaseOrder.VIEW', 'PurchaseOrder.CREATE', 'Approval.VIEW', 'Approval.SUBMIT', 'Approval.APPROVE',
    ];
    const labels = allNavItems(visibleNavGroups(canFrom(buyer))).map((i) => i.label).sort();
    expect(labels).toEqual(['Approval', 'Dashboard', 'Project Health', 'Projects', 'Purchase Order', 'Purchase Requisition', 'WBS']);
  });

  it('hides groups and subgroups that end up empty', () => {
    // Hanya Analytics.VIEW: grup "Main" tersisa (Analytics), sisanya hilang total.
    const groups = visibleNavGroups(canFrom(['Analytics.VIEW']));
    expect(groups.map((g) => g.label)).toEqual(['Main']);
    expect(allNavItems(groups).map((i) => i.label)).toEqual(['Executive Analytics', 'Advanced Reporting']);
  });

  it('admin-only pages are hidden from a non-admin user', () => {
    const labels = allNavItems(visibleNavGroups(() => false)).map((i) => i.label);
    expect(labels).not.toContain('Master Data');
    expect(labels).not.toContain('Foundation Hardening');
    expect(labels).not.toContain('Procurement Hardening');
  });
});
