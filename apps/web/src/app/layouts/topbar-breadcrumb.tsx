import { Fragment } from 'react';
import { useLocation } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { matchNav } from './nav-config';

/**
 * Breadcrumb topbar ([[UI-UX-Improvement-Plan]] §4). Dihitung dari `nav-config`
 * (satu sumber dengan sidebar), bukan peta route terpisah. Menampilkan
 * Grup › Subgrup › Item untuk item bertingkat; Grup › Item untuk grup flat.
 * Halaman yang tidak terdaftar di nav (mis. 404) tidak menampilkan breadcrumb.
 */
export function TopbarBreadcrumb() {
  const { pathname } = useLocation();
  const match = matchNav(pathname);
  if (!match) return null;

  const crumbs = match.subgroup ? [match.group, match.subgroup, match.label] : [match.group, match.label];

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-body-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb}-${index}`}>
              {index > 0 ? (
                <li aria-hidden="true" className="flex shrink-0 text-neutral-300">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
              ) : null}
              <li
                aria-current={isLast ? 'page' : undefined}
                className={isLast ? 'truncate font-medium text-neutral-900' : 'shrink-0 text-neutral-500'}
              >
                {crumb}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
