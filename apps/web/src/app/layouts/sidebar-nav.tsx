import { useMemo, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { ChevronDown, Search } from 'lucide-react';
import { cn, Input } from '@aec/ui';
import { allNavItems, isActiveRoute, navGroups, readCollapsed, STORAGE_KEY, type NavGroup } from './nav-config';

interface SidebarNavProps {
  /** Dipanggil saat item diklik — dipakai shell untuk menutup drawer mobile. */
  onNavigate: () => void;
}

/** Normalisasi untuk pencarian: huruf kecil, tanpa pemisah. `PR/PO` → `prpo`. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function useCollapseState() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const saved = readCollapsed();
    return Object.fromEntries(navGroups.map((g) => [g.label, saved[g.label] ?? g.defaultCollapsed ?? false]));
  });
  const toggle = (label: string) => {
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
  return { collapsed, toggle };
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { pathname } = useLocation();
  const { collapsed, toggle } = useCollapseState();
  const [query, setQuery] = useState('');

  const isItemActive = (to: string) => isActiveRoute(to, pathname);
  const isGroupActive = (group: NavGroup) => group.items.some((item) => isItemActive(item.to));

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return null;
    return allNavItems().filter((item) => normalize(`${item.group} ${item.label}`).includes(q));
  }, [query]);

  const itemClass = (active: boolean) =>
    cn(
      'flex items-center rounded px-3 py-1.5 transition-colors duration-fast',
      active
        ? 'border-l-2 border-racing-red-600 bg-racing-red-50 font-medium text-racing-red-700'
        : 'border-l-2 border-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
    );

  return (
    <div className="flex flex-col gap-2 px-2 pb-4">
      <div className="relative px-1 pt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search menu…"
          aria-label="Search menu"
          spellCheck={false}
          className="h-8 pl-8 text-body-sm"
        />
      </div>

      <nav className="text-body-sm" aria-label="Main menu">
        {results ? (
          <div className="mt-1">
            {results.length === 0 ? (
              <p className="px-3 py-2 text-caption text-neutral-500">No menu found.</p>
            ) : (
              results.map((item) => (
                <Link key={item.to} to={item.to} onClick={onNavigate} className={cn(itemClass(isItemActive(item.to)), 'flex-col items-start')}>
                  <span>{item.label}</span>
                  <span className="text-caption text-neutral-500">{item.group}</span>
                </Link>
              ))
            )}
          </div>
        ) : (
          navGroups.map((group) => {
            const open = collapsed[group.label] !== true;
            const active = isGroupActive(group);
            return (
              <div key={group.label} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggle(group.label)}
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
                    {group.items.map((item) => (
                      <Link key={item.to} to={item.to} onClick={onNavigate} className={itemClass(isItemActive(item.to))}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>
    </div>
  );
}
