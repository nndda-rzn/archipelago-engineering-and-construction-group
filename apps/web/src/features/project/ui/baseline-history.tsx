import type { BudgetBaselineSummary } from '@aec/api-contracts';
import { formatIdr, formatIdrCompact } from '@/shared/lib/format';

/**
 * Zona 4 — riwayat versi baseline sebagai timeline.
 *
 * Timeline, bukan tabel: yang perlu terbaca adalah "apa yang bergeser dan
 * kapan", dan itu cerita berurutan. Tabel versi akan membuang urutan itu.
 *
 * Versi terbaru yang FROZEN ditandai `current`. DRAFT tidak pernah ditandai
 * current — draft belum berlaku, dan menandainya current akan menyesatkan.
 */
export interface BaselineHistoryProps {
  versions: BudgetBaselineSummary[];
}

function formatDate(iso: string | null): string {
  if (!iso) return 'not frozen';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function BaselineHistory({ versions }: BaselineHistoryProps) {
  const currentId = versions.find((v) => v.status === 'FROZEN')?.id;

  return (
    <section aria-label="Baseline history" className="border border-neutral-200 p-4">
      <h2 className="text-h3 text-neutral-900">Baseline history</h2>
      <p className="mt-0.5 text-caption text-neutral-600">Each frozen version, newest first.</p>

      {versions.length === 0 ? (
        <p className="mt-4 text-body-sm text-neutral-500">
          No baseline frozen yet. Freeze the current budget to start the history.
        </p>
      ) : (
        <ol className="mt-4">
          {versions.map((v, i) => {
            // Delta dibandingkan dengan versi tepat di bawahnya (lebih lama).
            const older = versions[i + 1];
            const delta = older ? v.total - older.total : null;
            const isCurrent = v.id === currentId;
            const isLast = i === versions.length - 1;

            return (
              <li key={v.id} data-testid={`version-${v.id}`} className="relative flex gap-3 pb-4 last:pb-0">
                <span aria-hidden="true" className="relative flex w-3 shrink-0 justify-center">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      v.status === 'DRAFT' ? 'border border-neutral-400 bg-white' : isCurrent ? 'bg-neutral-900' : 'bg-neutral-400'
                    }`}
                  />
                  {!isLast && <span className="absolute top-4 bottom-0 w-px bg-neutral-200" />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-body-sm tabular-nums text-neutral-900">v{v.version}</span>
                    <span className="text-caption uppercase text-neutral-500">
                      {v.status === 'DRAFT' ? 'draft' : 'frozen'}
                    </span>
                    {isCurrent && <span className="text-caption text-neutral-700">current</span>}
                    <span className="text-caption text-neutral-500">{formatDate(v.frozenAt)}</span>
                  </div>

                  {v.label && <p className="mt-0.5 text-body-sm text-neutral-800">{v.label}</p>}
                  {v.reason && <p className="mt-0.5 text-caption text-neutral-600">{v.reason}</p>}

                  <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-body-sm">
                    <span className="font-mono tabular-nums text-neutral-900" title={formatIdr(v.total)}>
                      {formatIdrCompact(v.total)}
                    </span>
                    {delta != null && (
                      <span
                        className={`font-mono text-caption tabular-nums ${delta < 0 ? 'text-destructive-700' : 'text-neutral-600'}`}
                        title={`vs v${older!.version}`}
                      >
                        {delta > 0 ? '+' : delta < 0 ? '−' : ''}
                        {formatIdrCompact(Math.abs(delta))} vs v{older!.version}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {versions.length === 1 && (
        <p className="mt-3 text-caption text-neutral-500">No revision yet — the original baseline still stands.</p>
      )}
    </section>
  );
}
