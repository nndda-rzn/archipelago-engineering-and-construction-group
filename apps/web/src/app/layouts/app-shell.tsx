import { useState } from 'react';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import { cn } from '@aec/ui';

type NavItem = { label: string; to: string };
type NavGroup = { label: string; items: NavItem[]; defaultCollapsed?: boolean };

const navGroups: NavGroup[] = [
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

const STORAGE_KEY = 'aec_sidebar_collapsed';

/** Baca state collapse per grup dari localStorage (toleran error). */
function readCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function AppShell() {
  const location = useLocation();
  const pathname = location.pathname;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const saved = readCollapsed();
    return Object.fromEntries(navGroups.map((g) => [g.label, saved[g.label] ?? g.defaultCollapsed ?? false]));
  });

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage tidak tersedia — abaikan
      }
      return next;
    });
  };

  /** Item aktif jika pathname sama persis (root `/`) atau diawali path item. */
  const isItemActive = (to: string) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`));

  /** Grup dianggap aktif bila salah satu item-nya aktif — otomatis expand. */
  const isGroupActive = (group: NavGroup) => group.items.some((item) => isItemActive(item.to));

  return (
    <div className="flex h-screen">
      { /* Skip link */ }
      <a
        href="#main-content"
        className="fixed -top-10 left-2 z-command rounded bg-racing-red-600 px-3 py-2 text-body-sm text-white focus-visible:top-2"
      >
        Lewati ke konten
      </a>

      { /* Sidebar */ }
      <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white" aria-label="Navigasi">
        <div className="flex items-center gap-2 px-4 py-4" translate="no">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-racing-red-600 text-h2 font-bold text-white">
            A
          </span>
          <span className="text-h2 font-semibold tracking-tight text-neutral-900">AEC ERP</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4 text-body-sm" aria-label="Menu utama">
          {navGroups.map((group) => {
            const open = collapsed[group.label] !== true;
            const active = isGroupActive(group);
            return (
              <div key={group.label} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={open}
                  className={cn(
                    'flex w-full items-center justify-between rounded px-3 py-1.5 text-caption font-medium uppercase tracking-wide transition-colors duration-fast',
                    active ? 'text-racing-red-700' : 'text-neutral-500 hover:text-neutral-800',
                  )}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform duration-fast', open ? '' : '-rotate-90')}
                    aria-hidden="true"
                  />
                </button>
                {open && (
                  <div className="mb-1">
                    {group.items.map((item) => {
                      const activeItem = isItemActive(item.to);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={cn(
                            'flex items-center rounded px-3 py-1.5 transition-colors duration-fast',
                            activeItem
                              ? 'border-l-2 border-racing-red-500 bg-racing-red-50 font-medium text-racing-red-700'
                              : 'border-l-2 border-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        { /* Sidebar footer — version */ }
        <div className="border-t border-neutral-200 px-4 py-3 text-caption text-neutral-400">AEC ERP v0.1.0</div>
      </aside>

      { /* Main area */ }
      <div className="flex flex-1 flex-col">
        { /* Topbar */ }
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <span className="text-body-sm font-medium text-neutral-700">AEC Group</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-caption text-neutral-500">admin@aec.local</span>
          </div>
        </header>

        { /* Content */ }
        <main id="main-content" className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
