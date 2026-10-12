import type { WbsItem } from '@aec/api-contracts';
import { CATEGORICAL_COLORS } from '@/shared/charts';
import { Money } from '@/shared/ui/money';
import { computeWbsSummary } from './wbs-summary';

/**
 * Strip ringkasan WBS: total budget/actual/progress + **bar komposisi** budget per
 * cabang (part-to-whole). Warna dari `CATEGORICAL_COLORS` (token, bukan hex baru);
 * tiap segmen punya padanan teks di legenda sehingga warna bukan satu-satunya sinyal.
 */
export function WbsSummaryStrip({ tree }: { tree: WbsItem[] }) {
  const summary = computeWbsSummary(tree);
  const branches = summary.branches.filter((b) => b.budget > 0);

  return (
    <section aria-label="WBS summary" className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-overline uppercase text-neutral-500">Total budget</dt>
          <dd className="mt-0.5 truncate font-mono text-h3 tabular-nums text-neutral-950"><Money value={summary.totalBudget} /></dd>
        </div>
        <div className="min-w-0">
          <dt className="text-overline uppercase text-neutral-500">Total actual</dt>
          <dd className="mt-0.5 truncate font-mono text-h3 tabular-nums text-neutral-950"><Money value={summary.totalActual} /></dd>
        </div>
        <div className="min-w-0">
          <dt className="text-overline uppercase text-neutral-500">Progress</dt>
          <dd className="mt-0.5 truncate font-mono text-h3 tabular-nums text-neutral-950">
            {summary.totalProgress == null ? '—' : `${Math.round(summary.totalProgress)}%`}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-overline uppercase text-neutral-500">Branches</dt>
          <dd className="mt-0.5 truncate font-mono text-h3 tabular-nums text-neutral-950">{summary.rootCount}</dd>
        </div>
      </dl>

      {branches.length > 0 && (
        <div className="flex flex-col gap-2">
          <div
            role="img"
            aria-label={`Budget share by branch: ${branches.map((b) => `${b.code} ${b.name} ${Math.round(b.sharePct)}%`).join(', ')}`}
            className="flex h-2.5 w-full overflow-hidden rounded-sm bg-neutral-100"
          >
            {branches.map((b, i) => (
              <span
                key={b.id}
                data-slot="wbs-share"
                className="h-full"
                style={{ width: `${b.sharePct}%`, backgroundColor: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length] }}
                title={`${b.code} ${b.name}: ${Math.round(b.sharePct)}% of budget`}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-neutral-600">
            {branches.map((b, i) => (
              <li key={b.id} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length] }}
                  aria-hidden="true"
                />
                <span className="font-mono tabular-nums text-neutral-500">{b.code}</span>
                <span className="max-w-[12rem] truncate" title={b.name}>{b.name}</span>
                <span className="font-mono tabular-nums text-neutral-500">{Math.round(b.sharePct)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
