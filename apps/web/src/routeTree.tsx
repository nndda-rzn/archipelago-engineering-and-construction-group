import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { AppShell } from './app/layouts/app-shell';
import { LoginPage } from './features/auth/login.page';
import { LegalEntityListPage } from './features/foundation/legal-entity-list.page';
import { UserManagementPage } from './features/foundation/user-management.page';
import { RoleManagementPage } from './features/foundation/role-management.page';
import { AuditLogPage } from './features/audit/audit-log.page';
import { ProjectListPage } from './features/project/project-list.page';
import { WbsPage } from './features/project/wbs.page';
import { BudgetPage } from './features/project/budget.page';
import { PurchaseRequisitionPage } from './features/procurement/purchase-requisition.page';
import { PurchaseOrderPage } from './features/procurement/purchase-order.page';
import { GoodsReceiptPage } from './features/inventory/goods-receipt.page';
import { StockLedgerPage } from './features/inventory/stock-ledger.page';
import { MaterialIssuePage } from './features/inventory/material-issue.page';
import { StockAdjustmentPage } from './features/inventory/stock-adjustment.page';
import { StockOpnamePage } from './features/inventory/stock-opname.page';
import { StockTransferPage } from './features/inventory/stock-transfer.page';
import { ApprovalPage } from './features/approval/approval.page';
import { VendorInvoicePage } from './features/finance/vendor-invoice.page';
import { PaymentPage } from './features/finance/payment.page';
import { requireAuth } from './app/router/require-auth';
import { HealthBadge } from './widgets/health/health-badge';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Standalone — tanpa AppShell
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// App layout — pakai AppShell (sidebar + topbar), wajib login
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: requireAuth,
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: () => (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Dashboard</h1>
          <p className="mt-1 text-body-sm text-neutral-500">AEC ERP — Enterprise Construction &amp; EPC Platform</p>
        </div>
        <HealthBadge />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="text-caption text-neutral-500">Proyek Aktif</div>
          <div className="mt-1 font-mono text-h1 tabular-nums text-neutral-950">12</div>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="text-caption text-neutral-500">Legal Entities</div>
          <div className="mt-1 font-mono text-h1 tabular-nums text-neutral-950">5</div>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="text-caption text-neutral-500">Vendor</div>
          <div className="mt-1 font-mono text-h1 tabular-nums text-neutral-950">1.000+</div>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="text-caption text-neutral-500">Status</div>
          <div className="mt-1 flex items-center gap-1.5 text-body-sm font-medium text-project-on-track-600">
            <span className="inline-block h-2 w-2 rounded-full bg-project-on-track-500" aria-hidden="true" />
            Sistem Sehat
          </div>
        </div>
      </div>
    </div>
  ),
});

const legalEntitiesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/legal-entities',
  component: LegalEntityListPage,
});

const usersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/users',
  component: UserManagementPage,
});

const rolesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/roles',
  component: RoleManagementPage,
});

const auditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/audit-logs',
  component: AuditLogPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/projects',
  component: ProjectListPage,
});

const wbsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/wbs',
  component: WbsPage,
});

const budgetRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/budget',
  component: BudgetPage,
});

const prRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/procurement/pr',
  component: PurchaseRequisitionPage,
});

const poRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/procurement/po',
  component: PurchaseOrderPage,
});

const grRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/goods-receipts',
  component: GoodsReceiptPage,
});

const stockLedgerRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/stock-ledger',
  component: StockLedgerPage,
});

const materialIssueRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/material-issues',
  component: MaterialIssuePage,
});

const approvalRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/approvals',
  component: ApprovalPage,
});

const stockAdjustmentRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/stock-adjustments',
  component: StockAdjustmentPage,
});

const stockOpnameRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/stock-opnames',
  component: StockOpnamePage,
});

const stockTransferRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/stock-transfers',
  component: StockTransferPage,
});

const vendorInvoiceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/vendor-invoices',
  component: VendorInvoicePage,
});

const paymentRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/payments',
  component: PaymentPage,
});

export const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([indexRoute, legalEntitiesRoute, usersRoute, rolesRoute, auditRoute, projectsRoute, wbsRoute, budgetRoute, prRoute, poRoute, grRoute, stockLedgerRoute, materialIssueRoute, stockAdjustmentRoute, stockOpnameRoute, stockTransferRoute, approvalRoute, vendorInvoiceRoute, paymentRoute]),
]);
