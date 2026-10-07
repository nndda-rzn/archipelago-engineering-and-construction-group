import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { ChevronDown, Search } from 'lucide-react';
import { cn, Collapsible, CollapsibleContent, CollapsibleTrigger, Input } from '@aec/ui';
import { usePendingApprovals } from '@/features/analytics/model/analytics.api';
import { allNavItems, leavesOf, matchNav, navGroups, nodeKey, readCollapsed, STORAGE_KEY, visibleNavGroups, type NavGroup } from './nav-config';
import { usePermissions } from '@/entities/session';
import { Guides, NavLink, type GuideSpec } from './sidebar-nav-parts';

interface SidebarNavProps {
  /** Dipanggil saat item diklik — dipakai shell untuk menutup drawer mobile. */
  onNavigate: () => void;
}

/** Normalisasi untuk pencarian: huruf kecil, tanpa pemisah. `PR/PO` → `prpo`. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Hitung status buka/tutup setiap node (grup + subgrup). Node yang memuat route
 * aktif **dipaksa terbuka** (lokasi saat ini selalu terlihat) — mengalahkan state
 * tersimpan. Node lain mengikuti `saved` bila ada, jika tidak `defaultCollapsed`.
 *
 * "Aktif" di sini berarti sama dengan yang dipakai highlight: item yang dipilih
 * `matchNav` (match paling spesifik), bukan sekadar prefix — supaya route
 * bersarang (`/analytics/reporting`) tidak ikut membuka/menyalakan induknya.
 */
export function resolveOpenNodes(pathname: string, saved: Record<string, boolean>, groups: NavGroup[] = navGroups): Record<string, boolean> {
  const activeTo = matchNav(pathname)?.to ?? null;
  const result: Record<string, boolean> = {};
  for (const group of groups) {
    const groupHasActive = leavesOf(group).some((item) => item.to === activeTo);
    result[group.label] = groupHasActive ? true : (saved[group.label] ?? !(group.defaultCollapsed ?? false));

    for (const sub of group.subgroups ?? []) {
      const key = nodeKey(group.label, sub.label);
      const subHasActive = sub.items.some((item) => item.to === activeTo);
      result[key] = subHasActive ? true : (saved[key] ?? !(sub.defaultCollapsed ?? false));
    }
  }
  return result;
}

/** Gulir elemen aktif ke dalam viewport tanpa mengganggu scroll halaman. */
export function scrollActiveIntoView(container: ParentNode | null): void {
  const el = container?.querySelector<HTMLElement>('[aria-current="page"]');
  el?.scrollIntoView({ block: 'nearest' });
}

function useOpenNodes(pathname: string, groups: NavGroup[]) {
  const [saved, setSaved] = useState<Record<string, boolean>>(() => readCollapsed());
  const toggle = (key: string) => {
    setSaved((prev) => {
      // Baca status efektif saat ini (node aktif selalu terbuka) lalu balik.
      const effective = resolveOpenNodes(pathname, prev, groups);
      const next = { ...prev, [key]: !effective[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        void 0;
      }
      return next;
    });
  };
  return { open: resolveOpenNodes(pathname, saved, groups), toggle };
}

/**
 * Bagian presentasional (garis pemandu + baris item) dipindah ke
 * `sidebar-nav-parts.tsx`. Di sini hanya tinggal orkestrasi state.
 */
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { pathname } = useLocation();
  const { can } = usePermissions();
  // Navigasi disaring ke item yang permission-nya dimiliki user. Grup/subgrup
  // yang jadi kosong ikut hilang, jadi menu terlarang benar-benar tidak dirender.
  const groups = useMemo(() => visibleNavGroups(can), [can]);
  const { open, toggle } = useOpenNodes(pathname, groups);
  const [query, setQuery] = useState('');
  const navRef = useRef<HTMLElement>(null);
  const { data: pending } = usePendingApprovals();
  const pendingCount = pending?.count ?? 0;

  // Satu sumber kebenaran: item aktif = match paling spesifik dari `matchNav`
  // (dipakai juga oleh breadcrumb). Mencegah highlight ganda pada route
  // bersarang seperti /analytics/reporting (induk + anak).
  const activeTo = matchNav(pathname)?.to ?? null;
  const isItemActive = (to: string) => to === activeTo;

  // Setelah render (atau saat route berubah), pastikan item aktif terlihat —
  // relevan ketika grup/subgrup default-collapsed baru saja dibuka paksa.
  useEffect(() => {
    scrollActiveIntoView(navRef.current);
  }, [pathname, query]);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return null;
    return allNavItems(groups).filter((item) => normalize(`${item.group} ${item.subgroup ?? ''} ${item.label}`).includes(q));
  }, [query, groups]);

  const headerClass = (active: boolean) =>
    cn(
      'group relative flex w-full items-center gap-2 rounded-md py-1.5 pl-3 pr-2 text-overline uppercase transition-colors duration-fast',
      active ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800',
    );

  const subHeaderClass = (active: boolean) =>
    cn(
      'group relative flex w-full items-center gap-2 rounded-md py-1 pl-8 pr-2 text-body-sm font-medium transition-colors duration-fast',
      active ? 'text-neutral-900' : 'text-neutral-600 hover:text-neutral-900',
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

      <nav ref={navRef} className="text-body-sm" aria-label="Main menu">
        {results ? (
          <div className="mt-1">
            {results.length === 0 ? (
              <p className="px-3 py-2 text-caption text-neutral-500">No menu found.</p>
            ) : (
              results.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={cn(
                    'flex min-h-7 flex-col items-start justify-center rounded-md px-3 py-1 text-body-sm',
                    isItemActive(item.to) ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900',
                  )}
                >
                  <span>{item.label}</span>
                  <span className="text-caption text-neutral-500">{item.subgroup ? `${item.group} › ${item.subgroup}` : item.group}</span>
                </Link>
              ))
            )}
          </div>
        ) : (
          groups.map((group) => {
            const isOpen = open[group.label] === true;
            const groupActive = leavesOf(group).some((item) => isItemActive(item.to));
            const Icon = group.icon;
            return (
              <Collapsible key={group.label} open={isOpen} onOpenChange={() => toggle(group.label)} className="mb-1">
                <CollapsibleTrigger className={headerClass(groupActive)}>
                  {/* Batang dari header turun ke anak-anaknya — menyambung sampai anak terakhir. */}
                  {isOpen ? <Guides specs={[{ x: 'left-5', kind: 'bottom' }]} /> : null}
                  <Icon className={cn('h-4 w-4 shrink-0', groupActive ? 'text-neutral-700' : 'text-neutral-400 group-hover:text-neutral-600')} aria-hidden="true" />
                  <span className="truncate">{group.label}</span>
                  <ChevronDown className={cn('ml-auto h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-fast', isOpen ? '' : '-rotate-90')} aria-hidden="true" />
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                  {group.subgroups
                    ? group.subgroups.map((sub, subIndex) => {
                        const key = nodeKey(group.label, sub.label);
                        const subOpen = open[key] === true;
                        const subActive = sub.items.some((item) => isItemActive(item.to));
                        const isLastSub = subIndex === (group.subgroups?.length ?? 0) - 1;
                        const subSpecs: GuideSpec[] = [
                          { x: 'left-5', kind: 'top' },
                          { x: 'left-5', kind: 'stub' },
                        ];
                        // Batang level-1 berlanjut ke bawah bila subgrup ini bukan yang terakhir.
                        if (!isLastSub) subSpecs.push({ x: 'left-5', kind: 'bottom' });
                        return (
                          <Collapsible key={key} open={subOpen} onOpenChange={() => toggle(key)}>
                            <CollapsibleTrigger className={subHeaderClass(subActive)}>
                              <Guides specs={subSpecs} />
                              {/* Batang ke anak-anak subgrup, sejajar dengan batang item (left-8). */}
                              {subOpen ? <Guides specs={[{ x: 'left-8', kind: 'bottom' }]} /> : null}
                              <span className="truncate">{sub.label}</span>
                              <ChevronDown className={cn('ml-auto h-3 w-3 shrink-0 text-neutral-400 transition-transform duration-fast', subOpen ? '' : '-rotate-90')} aria-hidden="true" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                              {sub.items.map((item, index) => (
                                <NavLink
                                  key={item.to}
                                  item={item}
                                  active={isItemActive(item.to)}
                                  badge={item.to === '/approvals' ? pendingCount : undefined}
                                  x="left-8"
                                  isLast={index === sub.items.length - 1}
                                  ancestorFull
                                  onNavigate={onNavigate}
                                />
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })
                    : (group.items ?? []).map((item, index, all) => (
                        <NavLink
                          key={item.to}
                          item={item}
                          active={isItemActive(item.to)}
                          badge={item.to === '/approvals' ? pendingCount : undefined}
                          x="left-5"
                          isLast={index === all.length - 1}
                          ancestorFull={false}
                          onNavigate={onNavigate}
                        />
                      ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </nav>
    </div>
  );
}
