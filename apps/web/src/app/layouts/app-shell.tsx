import { useState } from 'react';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@aec/ui';
import { navGroups, readCollapsed, STORAGE_KEY, type NavGroup } from './nav-config';
import { UserMenu } from './user-menu';

export function AppShell() {
  const location = useLocation();
  const pathname = location.pathname;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const saved = readCollapsed();
    return Object.fromEntries(navGroups.map((g) => [g.label, saved[g.label] ?? g.defaultCollapsed ?? false]));
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigateAndClose = () => {
    setMobileOpen(false);
  };

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        void 0;
      }
      return next;
    });
  };

  const isItemActive = (to: string) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`));

  const isGroupActive = (group: NavGroup) => group.items.some((item) => isItemActive(item.to));

  const sidebarContentNav = (
    <nav className="px-2 pb-4 text-body-sm" aria-label="Menu utama">
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
                      onClick={navigateAndClose}
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
  );

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2 px-4 py-4" translate="no">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-racing-red-600 text-h2 font-bold text-white">
          A
        </span>
        <span className="text-h2 font-semibold tracking-tight text-neutral-900">AEC ERP</span>
      </div>
      <div className="flex-1 overflow-y-auto">{sidebarContentNav}</div>
      <div className="border-t border-neutral-200 px-4 py-3 text-caption text-neutral-500">AEC ERP v0.1.0</div>
    </>
  );

  return (
    <div className="flex h-screen">
      {}
      <a
        href="#main-content"
        className="fixed -top-10 left-2 z-command rounded bg-racing-red-600 px-3 py-2 text-body-sm text-white focus-visible:top-2"
      >
        Lewati ke konten
      </a>

      {}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white lg:flex" aria-label="Navigasi">
        {sidebarContent}
      </aside>

      {}
      {mobileOpen && (
        <div className="fixed inset-0 z-drawer lg:hidden" role="dialog" aria-modal="true" aria-label="Navigasi">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-neutral-950/40"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-neutral-200 bg-white shadow-lg">
            <div className="flex items-center justify-between pr-2">
              <div className="flex items-center gap-2 px-4 py-4" translate="no">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-racing-red-600 text-h2 font-bold text-white">A</span>
                <span className="text-h2 font-semibold tracking-tight text-neutral-900">AEC ERP</span>
              </div>
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{sidebarContentNav}</div>
            <div className="border-t border-neutral-200 px-4 py-3 text-caption text-neutral-500">AEC ERP v0.1.0</div>
          </aside>
        </div>
      )}

      {}
      <div className="flex flex-1 flex-col">
        {}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-neutral-500 transition-colors duration-fast hover:bg-neutral-100 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="text-body-sm font-medium text-neutral-700">AEC Group</span>
          </div>
          <UserMenu />
        </header>

        {}
        <main id="main-content" className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
