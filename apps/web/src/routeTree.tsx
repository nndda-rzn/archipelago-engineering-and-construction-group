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

export const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([indexRoute, legalEntitiesRoute, usersRoute, rolesRoute, auditRoute, projectsRoute, wbsRoute, budgetRoute]),
]);
