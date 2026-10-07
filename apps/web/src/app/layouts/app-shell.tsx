import { useEffect, useRef, useState } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import { Bell, HelpCircle, Menu, Search, X } from 'lucide-react';
import { usePendingApprovals } from '@/features/analytics/model/analytics.api';
import { SidebarNav } from './sidebar-nav';
import { TopbarBreadcrumb } from './topbar-breadcrumb';
import { UserMenu } from './user-menu';
import { CommandPalette } from '@/widgets/command-palette';

/** Label environment untuk shell bar. `DEMO` saat build non-produksi. */
const ENV_LABEL = import.meta.env.PROD ? 'PROD' : 'DEMO';

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const { data: pending } = usePendingApprovals();
  const pendingCount = pending?.count ?? 0;

  // ⌘K / Ctrl+K membuka command palette (navigasi). Berlaku di seluruh app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const panel = drawerRef.current;
    if (!panel) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const first = getFocusable()[0];
    first?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [mobileOpen]);

  const navigateAndClose = () => {
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      <div data-slot="brand-header" className="flex h-12 shrink-0 items-center gap-2.5 border-b border-neutral-200 px-4" translate="no">
        <img src="/logo-mark.png" alt="" aria-hidden="true" className="h-7 w-7 shrink-0 object-contain" />
        <span className="text-h2 font-semibold tracking-tight text-neutral-900">AEC</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav onNavigate={navigateAndClose} />
      </div>
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
        Skip to content
      </a>

      {}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white lg:flex" aria-label="Navigation">
        {sidebarContent}
      </aside>

      {}
      {mobileOpen && (
        <div className="fixed inset-0 z-drawer lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-neutral-950/40"
          />
          <aside ref={drawerRef} className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-neutral-200 bg-white shadow-md">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 pr-2" data-slot="brand-header">
              <div className="flex items-center gap-2.5 px-4" translate="no">
                <img src="/logo-mark.png" alt="" aria-hidden="true" className="h-7 w-7 shrink-0 object-contain" />
                <span className="text-h2 font-semibold tracking-tight text-neutral-900">AEC</span>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav onNavigate={navigateAndClose} />
            </div>
            <div className="border-t border-neutral-200 px-4 py-3 text-caption text-neutral-500">AEC ERP v0.1.0</div>
          </aside>
        </div>
      )}

      {}
      <div className="flex flex-1 flex-col">
        {}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-neutral-500 transition-colors duration-fast hover:bg-neutral-100 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <TopbarBreadcrumb />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Environment badge — konteks sistem: di mana saya berada. */}
            <span
              className="hidden rounded border border-warning-400 bg-warning-50 px-1.5 py-0.5 text-caption font-semibold tracking-wide text-warning-700 sm:inline"
              translate="no"
            >
              {ENV_LABEL}
            </span>

            {/* Global search / command palette. */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
              className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1 text-caption text-neutral-500 transition-colors duration-fast hover:bg-neutral-100"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded border border-neutral-200 px-1 font-mono text-[10px] sm:inline">⌘K</kbd>
            </button>

            {/* Notifikasi approval — nyata, membawa jumlah pending. */}
            <Link
              to="/approvals"
              aria-label={pendingCount > 0 ? `Approvals, ${pendingCount} pending` : 'Approvals'}
              className="relative rounded-md p-1.5 text-neutral-500 transition-colors duration-fast hover:bg-neutral-100"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {pendingCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-racing-red-600 px-1 font-mono text-[10px] font-semibold text-white tabular-nums">
                  {pendingCount}
                </span>
              )}
            </Link>

            <Link
              to="/"
              aria-label="Help"
              className="hidden rounded-md p-1.5 text-neutral-500 transition-colors duration-fast hover:bg-neutral-100 sm:inline-flex"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </Link>

            <UserMenu />
          </div>
        </header>

        {}
        <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden bg-surface-canvas p-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
