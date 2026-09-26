import { useEffect, useRef, useState } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { SidebarNav } from './sidebar-nav';
import { TopbarBreadcrumb } from './topbar-breadcrumb';
import { UserMenu } from './user-menu';

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);

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
      <div className="flex items-center gap-2 px-4 py-4" translate="no">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-racing-red-600 text-h2 font-bold text-white">
          A
        </span>
        <span className="text-h2 font-semibold tracking-tight text-neutral-900">AEC ERP</span>
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
          <aside ref={drawerRef} className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-neutral-200 bg-white shadow-lg">
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
              aria-label="Buka menu"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-neutral-500 transition-colors duration-fast hover:bg-neutral-100 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <TopbarBreadcrumb />
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
