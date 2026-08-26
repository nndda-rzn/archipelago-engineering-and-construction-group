import { Outlet } from '@tanstack/react-router';
import { Briefcase, Building2, ClipboardCheck, Construction, DollarSign, FolderTree, Gavel, HardHat, LayoutDashboard, Package, Shield, Truck, Users, Wrench } from 'lucide-react';
import { cn } from '@aec/ui';

type NavItem = { label: string; icon: typeof LayoutDashboard; to: string; active?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
      { label: 'Legal Entities', icon: Building2, to: '/foundation/legal-entities' },
      { label: 'User Management', icon: Users, to: '/foundation/users' },
      { label: 'Role Management', icon: Shield, to: '/foundation/roles' },
      { label: 'Audit Trail', icon: ClipboardCheck, to: '/foundation/audit-logs' },
      { label: 'Approval', icon: Shield, to: '/approvals' },
      { label: 'Workflow', icon: Shield, to: '/workflows' },
    ],
  },
  {
    label: 'Domain',
    items: [
      { label: 'Proyek', icon: HardHat, to: '/projects' },
      { label: 'WBS', icon: FolderTree, to: '/wbs' },
      { label: 'Budget', icon: DollarSign, to: '/budget' },
      { label: 'Project Health', icon: DollarSign, to: '/project-health' },
      { label: 'Komersial', icon: Briefcase, to: '/commercial' },
      { label: 'Engineering', icon: Wrench, to: '/engineering' },
      { label: 'Pengadaan', icon: Package, to: '/procurement/pr' },
      { label: 'Purchase Order', icon: Package, to: '/procurement/po' },
      { label: 'RFQ', icon: Package, to: '/procurement/rfq' },
      { label: 'Vendor Invoice', icon: DollarSign, to: '/finance/vendor-invoices' },
      { label: 'Payment', icon: DollarSign, to: '/finance/payments' },
      { label: 'Progress Claim', icon: DollarSign, to: '/finance/progress-claims' },
      { label: 'Client Invoice', icon: DollarSign, to: '/finance/client-invoices' },
      { label: 'Collection', icon: DollarSign, to: '/finance/collections' },
      { label: 'Variation Order', icon: DollarSign, to: '/finance/variations' },
      { label: 'GL Journal', icon: DollarSign, to: '/finance/journals' },
      { label: 'Trial Balance', icon: DollarSign, to: '/finance/trial-balance' },
      { label: 'Chart of Accounts', icon: DollarSign, to: '/finance/chart-of-accounts' },
      { label: 'Goods Receipt', icon: Package, to: '/inventory/goods-receipts' },
      { label: 'Material Issue', icon: Truck, to: '/inventory/material-issues' },
      { label: 'Stock Adjustment', icon: Truck, to: '/inventory/stock-adjustments' },
      { label: 'Stock Opname', icon: Truck, to: '/inventory/stock-opnames' },
      { label: 'Stock Transfer', icon: Truck, to: '/inventory/stock-transfers' },
      { label: 'Stock Ledger', icon: Truck, to: '/inventory/stock-ledger' },
      { label: 'Inventaris', icon: Truck, to: '/inventory' },
      { label: 'Konstruksi', icon: Construction, to: '/construction/work-packages' },
      { label: 'Daily Report', icon: Construction, to: '/construction/daily-reports' },
      { label: 'Commissioning', icon: Construction, to: '/construction/commissioning' },
      { label: 'Handover', icon: Construction, to: '/construction/handover' },
      { label: 'Keuangan', icon: DollarSign, to: '/finance' },
      { label: 'HCM', icon: Users, to: '/hcm' },
      { label: 'Peralatan', icon: Gavel, to: '/equipment' },
      { label: 'HSE', icon: Shield, to: '/hse' },
      { label: 'Kualitas', icon: ClipboardCheck, to: '/quality' },
      { label: 'Tata Kelola', icon: Building2, to: '/governance' },
    ],
  },
];

export function AppShell() {
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
      <aside
        className="flex w-56 shrink-0 flex-col bg-racing-red-950 text-white"
        aria-label="Navigasi"
      >
        <div className="px-4 py-4 text-h2 font-semibold tracking-tight" translate="no">
          AEC ERP
        </div>
        <nav className="flex-1 overflow-y-auto px-2 text-body-sm" aria-label="Menu utama">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="mb-1 px-3 py-1 text-caption font-medium uppercase text-neutral-400 tracking-wide">
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive = item.active ?? false;
                return (
                  <a
                    key={item.to}
                    href={item.to}
                    className={cn(
                      'flex items-center gap-2 rounded px-3 py-2 transition-colors duration-fast',
                      isActive
                        ? 'bg-racing-red-800 text-white'
                        : 'text-neutral-100 hover:bg-racing-red-900',
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    {item.label}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
        { /* Sidebar footer — version */ }
        <div className="px-4 py-3 text-caption text-neutral-400 border-t border-racing-red-800">
          AEC ERP v0.1.0
        </div>
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