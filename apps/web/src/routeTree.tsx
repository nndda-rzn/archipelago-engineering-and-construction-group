import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';

// FSD: root route — app shell placeholder (layout menyusul commit berikutnya)
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <div>AEC ERP — placeholder</div>,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export { routeTree };
