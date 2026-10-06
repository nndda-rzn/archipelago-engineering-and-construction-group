import { EmptyState } from '@aec/ui';
import type { ProjectCostSummaryItem } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';

/** Ambang konsumsi budget — di atas 100% merah, di atas 90% kuning, sisanya netral. */
export function budgetTone(pct: number): string {
  if (pct > 100) return 'bg-destructive-600';
  if (pct > 90) return 'bg-warning-500';
  return 'bg-neutral-800';
}

/**
 * Ranking proyek menurut pemakaian budget — **horizontal bar tersortir** (label
 * proyek panjang, jadi batang horizontal lebih terbaca daripada vertikal).
 */
export function BudgetUsageBars({ items }: { items: ProjectCostSummaryItem[] }) {
  if (items.length === 0) {
    return <EmptyState title="No projects" description="No projects in this scope." />;
  }
  const sorted = [...items].sort((a, b) => b.budgetUsagePct - a.budgetUsagePct);

  return (
    <ul className="space-y-2">
      {sorted.map((p) => (
        <li key={p.projectCode} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
          <span className="truncate text-body-sm text-neutral-700">
            <span className="font-mono text-caption text-neutral-500">{p.projectCode}</span> · {p.projectName}
          </span>
          <span className={`text-right font-mono text-body-sm tabular-nums ${p.budgetUsagePct > 100 ? 'text-destructive-600' : 'text-neutral-900'}`}>
            {p.budgetUsagePct}%
          </span>
          <span className="col-span-2 flex items-center gap-2">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <span
                data-slot="budget-usage-fill"
                className={`block h-full rounded-full ${budgetTone(p.budgetUsagePct)}`}
                style={{ width: `${Math.min(100, p.budgetUsagePct)}%` }}
              />
            </span>
            <span className="w-40 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-500">
              {formatIdr(p.cost)} / {formatIdr(p.budget)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
