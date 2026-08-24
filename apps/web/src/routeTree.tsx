import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AppShell } from './app/layouts/app-shell';

// FSD: app/router — route table + guards menyusul
const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-neutral-500">AEC ERP — Enterprise Construction &amp; EPC Platform</p>
    </div>
  ),
});

const routeTree = rootRoute.addChildren([indexRoute]);

export { routeTree };
