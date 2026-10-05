import type { LucideIcon } from 'lucide-react';
import { Briefcase, Building2, FolderKanban, HardHat, LayoutDashboard, Shield, ShoppingCart, Wallet } from 'lucide-react';

export type NavItem = { label: string; to: string };

/**
 * Subgrup (level 2) — hanya dipakai grup besar yang itemnya bercabang alami.
 * `defaultCollapsed` di sini berarti subgrup tertutup saat pertama dibuka.
 */
export type NavSubgroup = { label: string; items: NavItem[]; defaultCollapsed?: boolean };

/**
 * Grup (level 1). Sebuah grup memakai **salah satu**: `items` (flat) atau
 * `subgroups` (bertingkat) — tidak keduanya. `icon` tampil di header grup.
 */
export type NavGroup = {
  label: string;
  icon: LucideIcon;
  defaultCollapsed?: boolean;
  items?: NavItem[];
  subgroups?: NavSubgroup[];
};

/**
 * Navigasi sidebar — 8 grup, 52 leaf (keputusan 2026-09-26 + perluasan treeview).
 * Tiga grup besar (Procurement & Inventory, Finance & Treasury, Construction & HCM)
 * dipecah menjadi subgrup agar cabangnya terbaca; lima grup lain tetap flat karena
 * memaksa subgrup di sana akan menghasilkan anak tunggal (satu klik tanpa manfaat).
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Main',
    icon: LayoutDashboard,
    items: [
      { label: 'Dashboard', to: '/' },
      { label: 'Executive Analytics', to: '/analytics' },
      { label: 'Advanced Reporting', to: '/analytics/reporting' },
      { label: 'Approval', to: '/approvals' },
      { label: 'Workflow', to: '/workflows' },
    ],
  },
  {
    label: 'Foundation',
    icon: Building2,
    items: [
      { label: 'Legal Entities', to: '/foundation/legal-entities' },
      { label: 'Foundation Hardening', to: '/foundation/hardening' },
      { label: 'Master Data', to: '/master-data' },
      { label: 'User Management', to: '/foundation/users' },
      { label: 'Role Management', to: '/foundation/roles' },
      { label: 'Audit Trail', to: '/foundation/audit-logs' },
    ],
  },
  {
    label: 'Project & Engineering',
    icon: FolderKanban,
    items: [
      { label: 'Projects', to: '/projects' },
      { label: 'WBS', to: '/wbs' },
      { label: 'Budget', to: '/budget' },
      { label: 'Project Health', to: '/project-health' },
      { label: 'Project Controls', to: '/project-controls' },
      { label: 'Engineering', to: '/engineering' },
    ],
  },
  {
    label: 'Commercial & Tender',
    icon: Briefcase,
    items: [
      { label: 'Commercial', to: '/commercial' },
      { label: 'Tender & Bid', to: '/commercial/tender' },
    ],
  },
  {
    label: 'Procurement & Inventory',
    icon: ShoppingCart,
    defaultCollapsed: true,
    subgroups: [
      {
        label: 'Procurement',
        items: [
          { label: 'Purchase Requisition', to: '/procurement/pr' },
          { label: 'Purchase Order', to: '/procurement/po' },
          { label: 'RFQ', to: '/procurement/rfq' },
          { label: 'Procurement Hardening', to: '/procurement/hardening' },
        ],
      },
      {
        label: 'Inventory',
        items: [
          { label: 'Goods Receipt', to: '/inventory/goods-receipts' },
          { label: 'Material Issue', to: '/inventory/material-issues' },
          { label: 'Stock Adjustment', to: '/inventory/stock-adjustments' },
          { label: 'Stock Opname', to: '/inventory/stock-opnames' },
          { label: 'Stock Transfer', to: '/inventory/stock-transfers' },
          { label: 'Stock Ledger', to: '/inventory/stock-ledger' },
        ],
      },
    ],
  },
  {
    label: 'Finance & Treasury',
    icon: Wallet,
    defaultCollapsed: true,
    subgroups: [
      {
        label: 'Receivable',
        items: [
          { label: 'Progress Claim', to: '/finance/progress-claims' },
          { label: 'Client Invoice', to: '/finance/client-invoices' },
          { label: 'Collection', to: '/finance/collections' },
        ],
      },
      {
        label: 'Payable',
        items: [
          { label: 'Vendor Invoice', to: '/finance/vendor-invoices' },
          { label: 'Payment', to: '/finance/payments' },
          { label: 'Variation Order', to: '/finance/variations' },
          { label: 'Subcontract', to: '/finance/subcontracts' },
        ],
      },
      {
        label: 'Accounting',
        items: [
          { label: 'GL Journal', to: '/finance/journals' },
          { label: 'Trial Balance', to: '/finance/trial-balance' },
          { label: 'Chart of Accounts', to: '/finance/chart-of-accounts' },
          { label: 'Finance Closure', to: '/finance/closure' },
        ],
      },
      {
        label: 'Treasury',
        items: [{ label: 'Treasury', to: '/treasury' }],
      },
    ],
  },
  {
    label: 'Construction & HCM',
    icon: HardHat,
    subgroups: [
      {
        label: 'Construction',
        items: [
          { label: 'Work Packages', to: '/construction/work-packages' },
          { label: 'Daily Report', to: '/construction/daily-reports' },
          { label: 'Commissioning', to: '/construction/commissioning' },
          { label: 'Handover', to: '/construction/handover' },
        ],
      },
      {
        label: 'HCM',
        items: [
          { label: 'Employee', to: '/hcm/employees' },
          { label: 'Timesheet', to: '/hcm/timesheets' },
          { label: 'Equipment', to: '/hcm/equipment' },
          { label: 'Payroll Allocation', to: '/hcm/payroll' },
        ],
      },
    ],
  },
  {
    label: 'Governance',
    icon: Shield,
    items: [
      { label: 'HSE', to: '/hse' },
      { label: 'Quality', to: '/quality' },
      { label: 'Governance', to: '/governance' },
    ],
  },
];

/** Semua leaf item dalam sebuah grup, apa pun bentuknya (flat atau bergrup). */
export function leavesOf(group: NavGroup): NavItem[] {
  if (group.subgroups) return group.subgroups.flatMap((sub) => sub.items);
  return group.items ?? [];
}

export type NavItemRef = NavItem & { group: string; subgroup?: string };

/** Daftar rata seluruh leaf dengan nama grup + subgrupnya — dipakai pencarian menu. */
export function allNavItems(): NavItemRef[] {
  return navGroups.flatMap((group) => {
    if (group.subgroups) {
      return group.subgroups.flatMap((sub) => sub.items.map((item) => ({ ...item, group: group.label, subgroup: sub.label })));
    }
    return (group.items ?? []).map((item) => ({ ...item, group: group.label }));
  });
}

/** Apakah `pathname` berada pada route `to` (tepat atau sebagai prefix segmen). */
export function isActiveRoute(to: string, pathname: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * Cari item nav yang cocok dengan `pathname`, memilih match **paling spesifik**
 * (path terpanjang) sehingga `/analytics/reporting` tidak jatuh ke `/analytics`.
 * Dipakai breadcrumb topbar.
 */
export function matchNav(pathname: string): NavItemRef | null {
  const matches = allNavItems().filter((item) => isActiveRoute(item.to, pathname));
  if (matches.length === 0) return null;
  return matches.reduce((best, item) => (item.to.length > best.to.length ? item : best));
}

export const STORAGE_KEY = 'aec_sidebar_collapsed';

/**
 * Kunci state untuk sebuah node tree. Grup memakai labelnya; subgrup memakai
 * `"{grup}/{subgrup}"` agar tidak bertabrakan dengan label grup mana pun.
 */
export function nodeKey(group: string, subgroup?: string): string {
  return subgroup ? `${group}/${subgroup}` : group;
}

export function readCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}
