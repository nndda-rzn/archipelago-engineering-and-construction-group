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
import { ProjectHealthPage } from './features/project/project-health.page';
import { PurchaseRequisitionPage } from './features/procurement/purchase-requisition.page';
import { PurchaseOrderPage } from './features/procurement/purchase-order.page';
import { RfqPage } from './features/procurement/rfq.page';
import { GoodsReceiptPage } from './features/inventory/goods-receipt.page';
import { StockLedgerPage } from './features/inventory/stock-ledger.page';
import { MaterialIssuePage } from './features/inventory/material-issue.page';
import { StockAdjustmentPage } from './features/inventory/stock-adjustment.page';
import { StockOpnamePage } from './features/inventory/stock-opname.page';
import { StockTransferPage } from './features/inventory/stock-transfer.page';
import { ApprovalPage } from './features/approval/approval.page';
import { WorkflowDefinitionPage } from './features/approval/workflow-definition.page';
import { VendorInvoicePage } from './features/finance/vendor-invoice.page';
import { PaymentPage } from './features/finance/payment.page';
import { ChartOfAccountPage } from './features/finance/chart-of-account.page';
import { JournalPage } from './features/finance/journal.page';
import { TrialBalancePage } from './features/finance/trial-balance.page';
import { ProgressClaimPage } from './features/finance/progress-claim.page';
import { ClientInvoicePage } from './features/finance/client-invoice.page';
import { CollectionPage } from './features/finance/collection.page';
import { DashboardPage } from './features/dashboard/dashboard.page';
import { requireAuth } from './app/router/require-auth';

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
  component: DashboardPage,
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

const chartOfAccountRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/chart-of-accounts',
  component: ChartOfAccountPage,
});

const journalRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/journals',
  component: JournalPage,
});

const trialBalanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/trial-balance',
  component: TrialBalancePage,
});

const projectHealthRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/project-health',
  component: ProjectHealthPage,
});

const progressClaimRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/progress-claims',
  component: ProgressClaimPage,
});

const clientInvoiceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/client-invoices',
  component: ClientInvoicePage,
});

const collectionRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/collections',
  component: CollectionPage,
});

const workflowRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/workflows',
  component: WorkflowDefinitionPage,
});

const rfqRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/procurement/rfq',
  component: RfqPage,
});

export const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([indexRoute, legalEntitiesRoute, usersRoute, rolesRoute, auditRoute, projectsRoute, wbsRoute, budgetRoute, projectHealthRoute, prRoute, poRoute, rfqRoute, grRoute, stockLedgerRoute, materialIssueRoute, stockAdjustmentRoute, stockOpnameRoute, stockTransferRoute, approvalRoute, workflowRoute, vendorInvoiceRoute, paymentRoute, chartOfAccountRoute, journalRoute, trialBalanceRoute, progressClaimRoute, clientInvoiceRoute, collectionRoute]),
]);
