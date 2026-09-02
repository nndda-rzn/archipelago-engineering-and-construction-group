

export type NavItem = { label: string; to: string };
export type NavGroup = { label: string; items: NavItem[]; defaultCollapsed?: boolean };

export const navGroups: NavGroup[] = [
  {
    label: 'Main',
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
    label: 'Project',
    items: [
      { label: 'Proyek', to: '/projects' },
      { label: 'WBS', to: '/wbs' },
      { label: 'Budget', to: '/budget' },
      { label: 'Project Health', to: '/project-health' },
      { label: 'Project Controls', to: '/project-controls' },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { label: 'Komersial', to: '/commercial' },
      { label: 'Tender & Bid', to: '/commercial/tender' },
    ],
  },
  {
    label: 'Engineering',
    items: [{ label: 'Engineering', to: '/engineering' }],
  },
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
    label: 'Finance',
    defaultCollapsed: true,
    items: [
      { label: 'Vendor Invoice', to: '/finance/vendor-invoices' },
      { label: 'Payment', to: '/finance/payments' },
      { label: 'Progress Claim', to: '/finance/progress-claims' },
      { label: 'Client Invoice', to: '/finance/client-invoices' },
      { label: 'Collection', to: '/finance/collections' },
      { label: 'Variation Order', to: '/finance/variations' },
      { label: 'Subcontract', to: '/finance/subcontracts' },
      { label: 'GL Journal', to: '/finance/journals' },
      { label: 'Trial Balance', to: '/finance/trial-balance' },
      { label: 'Chart of Accounts', to: '/finance/chart-of-accounts' },
      { label: 'Finance Closure', to: '/finance/closure' },
      { label: 'Treasury', to: '/treasury' },
    ],
  },
  {
    label: 'Inventory',
    defaultCollapsed: true,
    items: [
      { label: 'Goods Receipt', to: '/inventory/goods-receipts' },
      { label: 'Material Issue', to: '/inventory/material-issues' },
      { label: 'Stock Adjustment', to: '/inventory/stock-adjustments' },
      { label: 'Stock Opname', to: '/inventory/stock-opnames' },
      { label: 'Stock Transfer', to: '/inventory/stock-transfers' },
      { label: 'Stock Ledger', to: '/inventory/stock-ledger' },
    ],
  },
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
  {
    label: 'HSE & Quality',
    items: [
      { label: 'HSE', to: '/hse' },
      { label: 'Kualitas', to: '/quality' },
      { label: 'Tata Kelola', to: '/governance' },
    ],
  },
];

export const STORAGE_KEY = 'aec_sidebar_collapsed';

export function readCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}
