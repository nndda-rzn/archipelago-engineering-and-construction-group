import { Outlet } from '@tanstack/react-router';

/**
 * AppShell — FSD layer app/layouts (PRD §20.3 sidebar racing-red-950).
 * Sidebar placeholder untuk scaffold; navigasi domain menyusul.
 */
export function AppShell() {
  return (
    <div className="flex h-screen">
      <aside className="w-56 shrink-0 bg-racing-red-950 text-white">
        <div className="px-4 py-4 text-lg font-semibold">AEC ERP</div>
        <nav className="px-2 text-sm">
          <div className="rounded bg-racing-red-800 px-3 py-2">Dashboard</div>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-workspace-background">
        <Outlet />
      </main>
    </div>
  );
}
