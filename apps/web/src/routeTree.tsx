import { createRootRoute, createRoute, lazyRouteComponent, Outlet } from '@tanstack/react-router';
import { Permission } from '@aec/shared-types';
import { AppShell } from './app/layouts/app-shell';
import { requireAuth } from './app/router/require-auth';
import { requirePermission } from './app/router/require-permission';

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
  beforeLoad: requirePermission(Permission.ProjectView),
  component: lazyRouteComponent(() => import('./pages/dashboard.page'), 'DashboardPage'),
});

const legalEntitiesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/legal-entities',
  beforeLoad: requirePermission(Permission.LegalEntityView),
  component: lazyRouteComponent(() => import('./pages/foundation/legal-entity-list.page'), 'LegalEntityListPage'),
});

const legalEntityDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/legal-entities/$entityId',
  beforeLoad: requirePermission(Permission.LegalEntityView),
  component: lazyRouteComponent(() => import('./pages/foundation/legal-entity-detail.page'), 'LegalEntityDetailPage'),
});

const foundationHardeningRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/hardening',
  beforeLoad: requirePermission(Permission.FoundationHardeningView),
  component: lazyRouteComponent(() => import('./pages/foundation/foundation-hardening.page'), 'FoundationHardeningPage'),
});

const usersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/users',
  beforeLoad: requirePermission(Permission.UserView),
  component: lazyRouteComponent(() => import('./pages/foundation/user-management.page'), 'UserManagementPage'),
});

const rolesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/roles',
  beforeLoad: requirePermission(Permission.RoleView),
  component: lazyRouteComponent(() => import('./pages/foundation/role-management.page'), 'RoleManagementPage'),
});

const auditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/foundation/audit-logs',
  beforeLoad: requirePermission(Permission.AuditView),
  component: lazyRouteComponent(() => import('./pages/foundation/audit-log.page'), 'AuditLogPage'),
});

const projectsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/projects',
  beforeLoad: requirePermission(Permission.ProjectView),
  component: lazyRouteComponent(() => import('./pages/project/project-list.page'), 'ProjectListPage'),
});

const projectDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/projects/$projectId',
  beforeLoad: requirePermission(Permission.ProjectView),
  component: lazyRouteComponent(() => import('./pages/project/project-detail.page'), 'ProjectDetailPage'),
});

const wbsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/wbs',
  beforeLoad: requirePermission(Permission.WbsView),
  component: lazyRouteComponent(() => import('./pages/project/wbs.page'), 'WbsPage'),
});

const budgetRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/budget',
  beforeLoad: requirePermission(Permission.BudgetView),
  component: lazyRouteComponent(() => import('./pages/project/budget.page'), 'BudgetPage'),
});

const prRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/procurement/pr',
  beforeLoad: requirePermission(Permission.PurchaseRequisitionView),
  component: lazyRouteComponent(() => import('./pages/procurement/purchase-requisition.page'), 'PurchaseRequisitionPage'),
});

const poRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/procurement/po',
  beforeLoad: requirePermission(Permission.PurchaseOrderView),
  component: lazyRouteComponent(() => import('./pages/procurement/purchase-order.page'), 'PurchaseOrderPage'),
});

const grRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/goods-receipts',
  beforeLoad: requirePermission(Permission.GoodsReceiptView),
  component: lazyRouteComponent(() => import('./pages/inventory/goods-receipt.page'), 'GoodsReceiptPage'),
});

const stockLedgerRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/stock-ledger',
  beforeLoad: requirePermission(Permission.StockLedgerView),
  component: lazyRouteComponent(() => import('./pages/inventory/stock-ledger.page'), 'StockLedgerPage'),
});

const materialIssueRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/material-issues',
  beforeLoad: requirePermission(Permission.MaterialIssueView),
  component: lazyRouteComponent(() => import('./pages/inventory/material-issue.page'), 'MaterialIssuePage'),
});

const approvalRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/approvals',
  beforeLoad: requirePermission(Permission.ApprovalView),
  component: lazyRouteComponent(() => import('./pages/approval/approval.page'), 'ApprovalPage'),
});

const stockAdjustmentRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/stock-adjustments',
  beforeLoad: requirePermission(Permission.StockAdjustmentView),
  component: lazyRouteComponent(() => import('./pages/inventory/stock-adjustment.page'), 'StockAdjustmentPage'),
});

const stockOpnameRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/stock-opnames',
  beforeLoad: requirePermission(Permission.StockOpnameView),
  component: lazyRouteComponent(() => import('./pages/inventory/stock-opname.page'), 'StockOpnamePage'),
});

const stockTransferRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inventory/stock-transfers',
  beforeLoad: requirePermission(Permission.StockTransferView),
  component: lazyRouteComponent(() => import('./pages/inventory/stock-transfer.page'), 'StockTransferPage'),
});

const vendorInvoiceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/vendor-invoices',
  beforeLoad: requirePermission(Permission.VendorInvoiceView),
  component: lazyRouteComponent(() => import('./pages/finance/vendor-invoice.page'), 'VendorInvoicePage'),
});

const paymentRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/payments',
  beforeLoad: requirePermission(Permission.PaymentView),
  component: lazyRouteComponent(() => import('./pages/finance/payment.page'), 'PaymentPage'),
});

const chartOfAccountRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/chart-of-accounts',
  beforeLoad: requirePermission(Permission.ChartOfAccountView),
  component: lazyRouteComponent(() => import('./pages/finance/chart-of-account.page'), 'ChartOfAccountPage'),
});

const journalRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/journals',
  beforeLoad: requirePermission(Permission.JournalView),
  component: lazyRouteComponent(() => import('./pages/finance/journal.page'), 'JournalPage'),
});

const trialBalanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/trial-balance',
  beforeLoad: requirePermission(Permission.JournalView),
  component: lazyRouteComponent(() => import('./pages/finance/trial-balance.page'), 'TrialBalancePage'),
});

const financeClosureRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/closure',
  beforeLoad: requirePermission(Permission.FiscalPeriodView),
  component: lazyRouteComponent(() => import('./pages/finance/finance-closure.page'), 'FinanceClosurePage'),
});

const projectHealthRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/project-health',
  beforeLoad: requirePermission(Permission.ProjectView),
  component: lazyRouteComponent(() => import('./pages/project/project-health.page'), 'ProjectHealthPage'),
});

const projectControlsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/project-controls',
  beforeLoad: requirePermission(Permission.ControlAccountView),
  component: lazyRouteComponent(() => import('./pages/project/project-controls.page'), 'ProjectControlsPage'),
});

const progressClaimRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/progress-claims',
  beforeLoad: requirePermission(Permission.ProgressClaimView),
  component: lazyRouteComponent(() => import('./pages/finance/progress-claim.page'), 'ProgressClaimPage'),
});

const clientInvoiceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/client-invoices',
  beforeLoad: requirePermission(Permission.ClientInvoiceView),
  component: lazyRouteComponent(() => import('./pages/finance/client-invoice.page'), 'ClientInvoicePage'),
});

const collectionRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/collections',
  beforeLoad: requirePermission(Permission.CollectionView),
  component: lazyRouteComponent(() => import('./pages/finance/collection.page'), 'CollectionPage'),
});

const variationRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/variations',
  beforeLoad: requirePermission(Permission.VariationView),
  component: lazyRouteComponent(() => import('./pages/finance/variation.page'), 'VariationPage'),
});

const subcontractRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/finance/subcontracts',
  beforeLoad: requirePermission(Permission.SubcontractView),
  component: lazyRouteComponent(() => import('./pages/finance/subcontract.page'), 'SubcontractPage'),
});

const employeesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/hcm/employees',
  beforeLoad: requirePermission(Permission.EmployeeView),
  component: lazyRouteComponent(() => import('./pages/hcm/employees.page'), 'EmployeesPage'),
});

const timesheetsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/hcm/timesheets',
  beforeLoad: requirePermission(Permission.TimesheetView),
  component: lazyRouteComponent(() => import('./pages/hcm/timesheets.page'), 'TimesheetsPage'),
});

const equipmentRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/hcm/equipment',
  beforeLoad: requirePermission(Permission.EquipmentView),
  component: lazyRouteComponent(() => import('./pages/hcm/equipment.page'), 'EquipmentPage'),
});

const payrollRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/hcm/payroll',
  beforeLoad: requirePermission(Permission.PayrollView),
  component: lazyRouteComponent(() => import('./pages/hcm/payroll.page'), 'PayrollPage'),
});

const hseRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/hse',
  beforeLoad: requirePermission(Permission.HseIncidentView),
  component: lazyRouteComponent(() => import('./pages/hse/hse.page'), 'HsePage'),
});

const qualityRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/quality',
  beforeLoad: requirePermission(Permission.QualityView),
  component: lazyRouteComponent(() => import('./pages/quality/quality.page'), 'QualityPage'),
});

const governanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/governance',
  beforeLoad: requirePermission(Permission.RiskView),
  component: lazyRouteComponent(() => import('./pages/governance/governance.page'), 'GovernancePage'),
});

const analyticsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/analytics',
  beforeLoad: requirePermission(Permission.AnalyticsView),
  component: lazyRouteComponent(() => import('./pages/analytics/analytics-dashboard.page'), 'AnalyticsDashboardPage'),
});

const reportingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/analytics/reporting',
  beforeLoad: requirePermission(Permission.AnalyticsView),
  component: lazyRouteComponent(() => import('./pages/analytics/reporting.page'), 'ReportingPage'),
});

const commercialRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/commercial',
  beforeLoad: requirePermission(Permission.ClientView),
  component: lazyRouteComponent(() => import('./pages/commercial/commercial.page'), 'CommercialPage'),
});

const tenderRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/commercial/tender',
  beforeLoad: requirePermission(Permission.OpportunityView),
  component: lazyRouteComponent(() => import('./pages/commercial/tender.page'), 'TenderPage'),
});

const engineeringRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/engineering',
  beforeLoad: requirePermission(Permission.EngineeringView),
  component: lazyRouteComponent(() => import('./pages/engineering/engineering.page'), 'EngineeringPage'),
});

const masterDataRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/master-data',
  beforeLoad: requirePermission(Permission.MasterDataView),
  component: lazyRouteComponent(() => import('./pages/master-data/master-data.page'), 'MasterDataPage'),
});

const treasuryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/treasury',
  beforeLoad: requirePermission(Permission.TreasuryView),
  component: lazyRouteComponent(() => import('./pages/treasury/treasury.page'), 'TreasuryPage'),
});

const workflowRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/workflows',
  beforeLoad: requirePermission(Permission.WorkflowView),
  component: lazyRouteComponent(() => import('./pages/approval/workflow-definition.page'), 'WorkflowDefinitionPage'),
});

const rfqRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/procurement/rfq',
  beforeLoad: requirePermission(Permission.RfqView),
  component: lazyRouteComponent(() => import('./pages/procurement/rfq.page'), 'RfqPage'),
});

const procurementHardeningRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/procurement/hardening',
  beforeLoad: requirePermission(Permission.ProcurementHardeningView),
  component: lazyRouteComponent(() => import('./pages/procurement/procurement-hardening.page'), 'ProcurementHardeningPage'),
});

const workPackagesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/construction/work-packages',
  beforeLoad: requirePermission(Permission.WorkPackageView),
  component: lazyRouteComponent(() => import('./pages/construction/work-packages.page'), 'WorkPackagesPage'),
});

const dailyReportsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/construction/daily-reports',
  beforeLoad: requirePermission(Permission.DailyReportView),
  component: lazyRouteComponent(() => import('./pages/construction/daily-reports.page'), 'DailyReportsPage'),
});

const commissioningRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/construction/commissioning',
  beforeLoad: requirePermission(Permission.CommissioningView),
  component: lazyRouteComponent(() => import('./pages/construction/commissioning.page'), 'CommissioningPage'),
});

const handoverRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/construction/handover',
  beforeLoad: requirePermission(Permission.HandoverView),
  component: lazyRouteComponent(() => import('./pages/construction/handover.page'), 'HandoverPage'),
});

// Halaman "Access denied". Sengaja TANPA guard permission: siapa pun yang login
// harus bisa melihatnya (itulah tujuan redirect dari requirePermission).
const forbiddenRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/forbidden',
  component: lazyRouteComponent(() => import('./pages/errors/access-denied.page'), 'AccessDeniedPage'),
});

export const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([forbiddenRoute, indexRoute, legalEntitiesRoute, legalEntityDetailRoute, foundationHardeningRoute, usersRoute, rolesRoute, auditRoute, projectsRoute, projectDetailRoute, wbsRoute, budgetRoute, projectHealthRoute, projectControlsRoute, prRoute, poRoute, rfqRoute, procurementHardeningRoute, grRoute, stockLedgerRoute, materialIssueRoute, stockAdjustmentRoute, stockOpnameRoute, stockTransferRoute, approvalRoute, workflowRoute, vendorInvoiceRoute, paymentRoute, chartOfAccountRoute, journalRoute, trialBalanceRoute, financeClosureRoute, progressClaimRoute, clientInvoiceRoute, collectionRoute, variationRoute, subcontractRoute, workPackagesRoute, dailyReportsRoute, commissioningRoute, handoverRoute, employeesRoute, timesheetsRoute, equipmentRoute, payrollRoute, hseRoute, qualityRoute, governanceRoute, analyticsRoute, reportingRoute, commercialRoute, tenderRoute, engineeringRoute, masterDataRoute, treasuryRoute]),
]);
