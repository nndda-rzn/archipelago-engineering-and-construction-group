import { useLocation } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { matchNav } from './nav-config';

/**
 * Breadcrumb topbar ([[UI-UX-Improvement-Plan]] §4). Dihitung dari `nav-config`
 * (satu sumber dengan sidebar), bukan peta route terpisah. Halaman yang tidak
 * terdaftar di nav (mis. 404) tidak menampilkan breadcrumb.
 */
export function TopbarBreadcrumb() {
  const { pathname } = useLocation();
  const match = matchNav(pathname);
  if (!match) return null;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-body-sm">
        <li className="shrink-0 text-neutral-500">{match.group}</li>
        <li aria-hidden="true" className="flex shrink-0 text-neutral-300">
          <ChevronRight className="h-3.5 w-3.5" />
        </li>
        <li aria-current="page" className="truncate font-medium text-neutral-900">
          {match.label}
        </li>
      </ol>
    </nav>
  );
}
