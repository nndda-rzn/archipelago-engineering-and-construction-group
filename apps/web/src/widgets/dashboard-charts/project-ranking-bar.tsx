import { EmptyState } from '@aec/ui';
import type { Portfolio } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { CHART, HEALTH_COLORS } from './chart-colors';

type PortfolioItem = Portfolio['items'][number];

export interface RankedProject {
  projectId: string;
  projectCode: string;
  projectName: string;
  variance: number;
  health: PortfolioItem['health'];
}

/**
 * Urutkan proyek dari variance terburuk (paling negatif) lebih dulu.
 * `limit` default 5 agar tetap ringkas.
 */
export function rankByVariance(items: PortfolioItem[], limit = 5): RankedProject[] {
  return [...items]
    .sort((a, b) => a.variance - b.variance)
    .slice(0, limit)
    .map((p) => ({
      projectId: p.projectId,
      projectCode: p.projectCode,
      projectName: p.projectName,
      variance: p.variance,
      health: p.health,
    }));
}

/** Bar ranking horizontal — variance proyek terburuk di atas. Klik → detail proyek. */
export function ProjectRankingBar({
  items,
  onSelect,
}: {
  items: PortfolioItem[];
  onSelect?: (projectId: string) => void;
}) {
  const ranked = rankByVariance(items);
  if (ranked.length === 0) {
    return <EmptyState title="No projects" description="No portfolio items to rank yet." />;
  }

  const maxAbs = Math.max(...ranked.map((r) => Math.abs(r.variance)), 1);

  return (
    <ul className="space-y-2">
      {ranked.map((r) => {
        const pct = Math.round((Math.abs(r.variance) / maxAbs) * 100);
        const negative = r.variance < 0;
        return (
          <li key={r.projectId}>
            <button
              type="button"
              onClick={() => onSelect?.(r.projectId)}
              className="flex w-full items-center gap-2 text-left"
            >
              <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: HEALTH_COLORS[r.health] }} aria-hidden="true" />
              <span className="w-28 shrink-0 truncate font-mono text-caption text-neutral-600" title={r.projectName}>
                {r.projectCode}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100" role="img" aria-label={`${r.projectCode} variance ${formatIdr(r.variance)}`}>
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: negative ? CHART.negative : CHART.positive }}
                />
              </span>
              <span className={`w-28 shrink-0 text-right font-mono text-caption tabular-nums ${negative ? 'text-destructive-600' : 'text-success-700'}`}>
                {formatIdr(r.variance)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
