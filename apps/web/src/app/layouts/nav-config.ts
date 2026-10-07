import type { LucideIcon } from 'lucide-react';
import { Briefcase, Building2, FolderKanban, HardHat, LayoutDashboard, Shield, ShoppingCart, Wallet } from 'lucide-react';
import { Permission, SUPERADMIN_ONLY, type NavPermission } from '@aec/shared-types';

/**
 * Satu item navigasi. `permission` menentukan siapa yang melihatnya: item tanpa
 * `permission` terlihat oleh semua user yang login; item dengan `permission`
 * hanya terlihat bila user memegang permission itu (atau SUPER_ADMIN).
 * `SUPERADMIN_ONLY` dipakai untuk halaman yang tidak punya resource permission.
 */
export type NavItem = { label: string; to: string; permission?: NavPermission };

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
      { label: 'Dashboard', to: '/', permission: Permission.ProjectView },
      { label: 'Executive Analytics', to: '/analytics', permission: Permission.AnalyticsView },
      { label: 'Advanced Reporting', to: '/analytics/reporting', permission: Permission.AnalyticsView },
      { label: 'Approval', to: '/approvals', permission: Permission.ApprovalView },
      { label: 'Workflow', to: '/workflows', permission: Permission.WorkflowView },
    ],
  },
  {
    label: 'Foundation',
    icon: Building2,
    items: [
      { label: 'Legal Entities', to: '/foundation/legal-entities', permission: Permission.LegalEntityView },
      { label: 'Foundation Hardening', to: '/foundation/hardening', permission: SUPERADMIN_ONLY },
      { label: 'Master Data', to: '/master-data', permission: SUPERADMIN_ONLY },
      { label: 'User Management', to: '/foundation/users', permission: Permission.UserView },
      { label: 'Role Management', to: '/foundation/roles', permission: Permission.RoleView },
      { label: 'Audit Trail', to: '/foundation/audit-logs', permission: Permission.AuditView },
    ],
  },
  {
    label: 'Project & Engineering',
    icon: FolderKanban,
    items: [
      { label: 'Projects', to: '/projects', permission: Permission.ProjectView },
      { label: 'WBS', to: '/wbs', permission: Permission.WBSView },
      { label: 'Budget', to: '/budget', permission: Permission.BudgetView },
      { label: 'Project Health', to: '/project-health', permission: Permission.ProjectView },
      { label: 'Project Controls', to: '/project-controls', permission: Permission.ControlAccountView },
      { label: 'Engineering', to: '/engineering', permission: Permission.EngineeringView },
    ],
  },
  {
    label: 'Commercial & Tender',
    icon: Briefcase,
    items: [
      { label: 'Commercial', to: '/commercial', permission: Permission.ClientView },
      { label: 'Tender & Bid', to: '/commercial/tender', permission: Permission.OpportunityView },
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
          { label: 'Purchase Requisition', to: '/procurement/pr', permission: Permission.PurchaseRequisitionView },
          { label: 'Purchase Order', to: '/procurement/po', permission: Permission.PurchaseOrderView },
          { label: 'RFQ', to: '/procurement/rfq', permission: Permission.RfqView },
          { label: 'Procurement Hardening', to: '/procurement/hardening', permission: SUPERADMIN_ONLY },
        ],
      },
      {
        label: 'Inventory',
        items: [
          { label: 'Goods Receipt', to: '/inventory/goods-receipts', permission: Permission.GoodsReceiptView },
          { label: 'Material Issue', to: '/inventory/material-issues', permission: Permission.MaterialIssueView },
          { label: 'Stock Adjustment', to: '/inventory/stock-adjustments', permission: Permission.StockAdjustmentView },
          { label: 'Stock Opname', to: '/inventory/stock-opnames', permission: Permission.StockOpnameView },
          { label: 'Stock Transfer', to: '/inventory/stock-transfers', permission: Permission.StockTransferView },
          { label: 'Stock Ledger', to: '/inventory/stock-ledger', permission: Permission.StockLedgerView },
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
          { label: 'Progress Claim', to: '/finance/progress-claims', permission: Permission.ProgressClaimView },
          { label: 'Client Invoice', to: '/finance/client-invoices', permission: Permission.ClientInvoiceView },
          { label: 'Collection', to: '/finance/collections', permission: Permission.CollectionView },
        ],
      },
      {
        label: 'Payable',
        items: [
          { label: 'Vendor Invoice', to: '/finance/vendor-invoices', permission: Permission.VendorInvoiceView },
          { label: 'Payment', to: '/finance/payments', permission: Permission.PaymentView },
          { label: 'Variation Order', to: '/finance/variations', permission: Permission.VariationView },
          { label: 'Subcontract', to: '/finance/subcontracts', permission: Permission.SubcontractView },
        ],
      },
      {
        label: 'Accounting',
        items: [
          { label: 'GL Journal', to: '/finance/journals', permission: Permission.JournalView },
          { label: 'Trial Balance', to: '/finance/trial-balance', permission: Permission.JournalView },
          { label: 'Chart of Accounts', to: '/finance/chart-of-accounts', permission: Permission.ChartOfAccountView },
          { label: 'Finance Closure', to: '/finance/closure', permission: Permission.FiscalPeriodView },
        ],
      },
      {
        label: 'Treasury',
        items: [{ label: 'Treasury', to: '/treasury', permission: Permission.TreasuryView }],
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
          { label: 'Work Packages', to: '/construction/work-packages', permission: Permission.WorkPackageView },
          { label: 'Daily Report', to: '/construction/daily-reports', permission: Permission.DailyReportView },
          { label: 'Commissioning', to: '/construction/commissioning', permission: Permission.CommissioningView },
          { label: 'Handover', to: '/construction/handover', permission: Permission.HandoverView },
        ],
      },
      {
        label: 'HCM',
        items: [
          { label: 'Employee', to: '/hcm/employees', permission: Permission.EmployeeView },
          { label: 'Timesheet', to: '/hcm/timesheets', permission: Permission.TimesheetView },
          { label: 'Equipment', to: '/hcm/equipment', permission: Permission.EquipmentView },
          { label: 'Payroll Allocation', to: '/hcm/payroll', permission: Permission.PayrollView },
        ],
      },
    ],
  },
  {
    label: 'Governance',
    icon: Shield,
    items: [
      { label: 'HSE', to: '/hse', permission: Permission.HseIncidentView },
      { label: 'Quality', to: '/quality', permission: Permission.QualityView },
      { label: 'Governance', to: '/governance', permission: Permission.RiskView },
    ],
  },
];

/** Semua leaf item dalam sebuah grup, apa pun bentuknya (flat atau bergrup). */
export function leavesOf(group: NavGroup): NavItem[] {
  if (group.subgroups) return group.subgroups.flatMap((sub) => sub.items);
  return group.items ?? [];
}

/** `true` bila user (via `can`) boleh melihat item ini. Item tanpa `permission` selalu boleh. */
export function canSeeItem(item: NavItem, can: (code: string) => boolean): boolean {
  return !item.permission || can(item.permission);
}

/**
 * Saring navigasi untuk user tertentu: buang item tanpa izin, lalu buang grup
 * dan subgrup yang tidak menyisakan anak. Hasilnya dipakai sidebar agar menu
 * yang tidak boleh diakses **hilang** (bukan disabled).
 */
export function visibleNavGroups(can: (code: string) => boolean): NavGroup[] {
  const result: NavGroup[] = [];
  for (const group of navGroups) {
    if (group.subgroups) {
      const subgroups = group.subgroups
        .map((sub) => ({ ...sub, items: sub.items.filter((item) => canSeeItem(item, can)) }))
        .filter((sub) => sub.items.length > 0);
      if (subgroups.length > 0) result.push({ ...group, subgroups });
      continue;
    }
    const items = (group.items ?? []).filter((item) => canSeeItem(item, can));
    if (items.length > 0) result.push({ ...group, items });
  }
  return result;
}

export type NavItemRef = NavItem & { group: string; subgroup?: string };

/** Daftar rata seluruh leaf dengan nama grup + subgrupnya — dipakai pencarian menu. */
export function allNavItems(groups: NavGroup[] = navGroups): NavItemRef[] {
  return groups.flatMap((group) => {
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
