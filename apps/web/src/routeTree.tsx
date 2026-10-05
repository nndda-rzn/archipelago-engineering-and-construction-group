import { createRootRoute, createRoute, lazyRouteComponent, Outlet } from '@tanstack/react-router';
import { AppShell } from './app/layouts/app-shell';
import { requireAuth } from './app/router/require-auth';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="text-center">
        <p className="text-h1 font-semibold text-neutral-900">404</p>
        <p className="mt-2 text-body-sm text-neutral-500">Page not found.</p>
        <a href="/" className="mt-4 inline-block text-body-sm font-medium text-racing-red-600 hover:underline">
          Back to Dashboard
        </a>
      </div>
    </div>
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: lazyRouteComponent(() => import('./pages/auth/login.page'), 'LoginPage'),
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: requireAuth,
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: lazyRouteComponent(() => import('./pages/dashboard.page'), 'DashboardPage'),
});

const legalEntitiesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/legal-entities',
  component: lazyRouteComponent(() => import('./pages/foundation/legal-entity-list.page'), 'LegalEntityListPage'),
});

const foundationHardeningRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/hardening',
  component: lazyRouteComponent(() => import('./pages/foundation/foundation-hardening.page'), 'FoundationHardeningPage'),
});

const usersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/users',
  component: lazyRouteComponent(() => import('./pages/foundation/user-management.page'), 'UserManagementPage'),
});

const rolesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/roles',
  component: lazyRouteComponent(() => import('./pages/foundation/role-management.page'), 'RoleManagementPage'),
});

const auditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/audit-logs',
  component: lazyRouteComponent(() => import('./pages/foundation/audit-log.page'), 'AuditLogPage'),
});

const projectsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/projects',
  component: lazyRouteComponent(() => import('./pages/project/project-list.page'), 'ProjectListPage'),
});

const wbsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/wbs',
  component: lazyRouteComponent(() => import('./pages/project/wbs.page'), 'WbsPage'),
});

const budgetRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/budget',
  component: lazyRouteComponent(() => import('./pages/project/budget.page'), 'BudgetPage'),
});

const prRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/procurement/pr',
  component: lazyRouteComponent(() => import('./pages/procurement/purchase-requisition.page'), 'PurchaseRequisitionPage'),
});

const poRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/procurement/po',
  component: lazyRouteComponent(() => import('./pages/procurement/purchase-order.page'), 'PurchaseOrderPage'),
});

const grRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/goods-receipts',
  component: lazyRouteComponent(() => import('./pages/inventory/goods-receipt.page'), 'GoodsReceiptPage'),
});

const stockLedgerRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/stock-ledger',
  component: lazyRouteComponent(() => import('./pages/inventory/stock-ledger.page'), 'StockLedgerPage'),
});

const materialIssueRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/material-issues',
  component: lazyRouteComponent(() => import('./pages/inventory/material-issue.page'), 'MaterialIssuePage'),
});

const approvalRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/approvals',
  component: lazyRouteComponent(() => import('./pages/approval/approval.page'), 'ApprovalPage'),
});

const stockAdjustmentRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/stock-adjustments',
  component: lazyRouteComponent(() => import('./pages/inventory/stock-adjustment.page'), 'StockAdjustmentPage'),
});

const stockOpnameRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/stock-opnames',
  component: lazyRouteComponent(() => import('./pages/inventory/stock-opname.page'), 'StockOpnamePage'),
});

const stockTransferRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/stock-transfers',
  component: lazyRouteComponent(() => import('./pages/inventory/stock-transfer.page'), 'StockTransferPage'),
});

const vendorInvoiceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/vendor-invoices',
  component: lazyRouteComponent(() => import('./pages/finance/vendor-invoice.page'), 'VendorInvoicePage'),
});

const paymentRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/payments',
  component: lazyRouteComponent(() => import('./pages/finance/payment.page'), 'PaymentPage'),
});

const chartOfAccountRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/chart-of-accounts',
  component: lazyRouteComponent(() => import('./pages/finance/chart-of-account.page'), 'ChartOfAccountPage'),
});

const journalRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/journals',
  component: lazyRouteComponent(() => import('./pages/finance/journal.page'), 'JournalPage'),
});

const trialBalanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/trial-balance',
  component: lazyRouteComponent(() => import('./pages/finance/trial-balance.page'), 'TrialBalancePage'),
});

const financeClosureRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/closure',
  component: lazyRouteComponent(() => import('./pages/finance/finance-closure.page'), 'FinanceClosurePage'),
});

const projectHealthRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/project-health',
  component: lazyRouteComponent(() => import('./pages/project/project-health.page'), 'ProjectHealthPage'),
});

const projectControlsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/project-controls',
  component: lazyRouteComponent(() => import('./pages/project/project-controls.page'), 'ProjectControlsPage'),
});

const progressClaimRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/progress-claims',
  component: lazyRouteComponent(() => import('./pages/finance/progress-claim.page'), 'ProgressClaimPage'),
});

const clientInvoiceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/client-invoices',
  component: lazyRouteComponent(() => import('./pages/finance/client-invoice.page'), 'ClientInvoicePage'),
});

const collectionRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/collections',
  component: lazyRouteComponent(() => import('./pages/finance/collection.page'), 'CollectionPage'),
});

const variationRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/variations',
  component: lazyRouteComponent(() => import('./pages/finance/variation.page'), 'VariationPage'),
});

const subcontractRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/subcontracts',
  component: lazyRouteComponent(() => import('./pages/finance/subcontract.page'), 'SubcontractPage'),
});

const employeesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/hcm/employees',
  component: lazyRouteComponent(() => import('./pages/hcm/employees.page'), 'EmployeesPage'),
});

const timesheetsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/hcm/timesheets',
  component: lazyRouteComponent(() => import('./pages/hcm/timesheets.page'), 'TimesheetsPage'),
});

const equipmentRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/hcm/equipment',
  component: lazyRouteComponent(() => import('./pages/hcm/equipment.page'), 'EquipmentPage'),
});

const payrollRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/hcm/payroll',
  component: lazyRouteComponent(() => import('./pages/hcm/payroll.page'), 'PayrollPage'),
});

const hseRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/hse',
  component: lazyRouteComponent(() => import('./pages/hse/hse.page'), 'HsePage'),
});

const qualityRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/quality',
  component: lazyRouteComponent(() => import('./pages/quality/quality.page'), 'QualityPage'),
});

const governanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/governance',
  component: lazyRouteComponent(() => import('./pages/governance/governance.page'), 'GovernancePage'),
});

const analyticsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/analytics',
  component: lazyRouteComponent(() => import('./pages/analytics/analytics-dashboard.page'), 'AnalyticsDashboardPage'),
});

const reportingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/analytics/reporting',
  component: lazyRouteComponent(() => import('./pages/analytics/reporting.page'), 'ReportingPage'),
});

const commercialRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/commercial',
  component: lazyRouteComponent(() => import('./pages/commercial/commercial.page'), 'CommercialPage'),
});

const tenderRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/commercial/tender',
  component: lazyRouteComponent(() => import('./pages/commercial/tender.page'), 'TenderPage'),
});

const engineeringRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/engineering',
  component: lazyRouteComponent(() => import('./pages/engineering/engineering.page'), 'EngineeringPage'),
});

const masterDataRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/master-data',
  component: lazyRouteComponent(() => import('./pages/master-data/master-data.page'), 'MasterDataPage'),
});

const treasuryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/treasury',
  component: lazyRouteComponent(() => import('./pages/treasury/treasury.page'), 'TreasuryPage'),
});

const workflowRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/workflows',
  component: lazyRouteComponent(() => import('./pages/approval/workflow-definition.page'), 'WorkflowDefinitionPage'),
});

const rfqRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/procurement/rfq',
  component: lazyRouteComponent(() => import('./pages/procurement/rfq.page'), 'RfqPage'),
});

const procurementHardeningRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/procurement/hardening',
  component: lazyRouteComponent(() => import('./pages/procurement/procurement-hardening.page'), 'ProcurementHardeningPage'),
});

const workPackagesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/construction/work-packages',
  component: lazyRouteComponent(() => import('./pages/construction/work-packages.page'), 'WorkPackagesPage'),
});

const dailyReportsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/construction/daily-reports',
  component: lazyRouteComponent(() => import('./pages/construction/daily-reports.page'), 'DailyReportsPage'),
});

const commissioningRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/construction/commissioning',
  component: lazyRouteComponent(() => import('./pages/construction/commissioning.page'), 'CommissioningPage'),
});

const handoverRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/construction/handover',
  component: lazyRouteComponent(() => import('./pages/construction/handover.page'), 'HandoverPage'),
});

export const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([indexRoute, legalEntitiesRoute, foundationHardeningRoute, usersRoute, rolesRoute, auditRoute, projectsRoute, wbsRoute, budgetRoute, projectHealthRoute, projectControlsRoute, prRoute, poRoute, rfqRoute, procurementHardeningRoute, grRoute, stockLedgerRoute, materialIssueRoute, stockAdjustmentRoute, stockOpnameRoute, stockTransferRoute, approvalRoute, workflowRoute, vendorInvoiceRoute, paymentRoute, chartOfAccountRoute, journalRoute, trialBalanceRoute, financeClosureRoute, progressClaimRoute, clientInvoiceRoute, collectionRoute, variationRoute, subcontractRoute, workPackagesRoute, dailyReportsRoute, commissioningRoute, handoverRoute, employeesRoute, timesheetsRoute, equipmentRoute, payrollRoute, hseRoute, qualityRoute, governanceRoute, analyticsRoute, reportingRoute, commercialRoute, tenderRoute, engineeringRoute, masterDataRoute, treasuryRoute]),
]);
