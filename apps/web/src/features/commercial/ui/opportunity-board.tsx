import type { Opportunity } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';

/**
 * Section 2 — Opportunity Board. Encoding: dot stepper (posisi dalam sequence).
 *
 * Bukan bar dan bukan tabel: setiap opportunity adalah baris dengan stepper lima
 * titik — stage saat ini sebagai titik terisi, stage lain kosong. Bar menyatakan
 * BESARAN; stepper menyatakan POSISI dalam proses. Dua pertanyaan berbeda.
 *
 * Diurutkan hottest dulu: expectedValue × probability. Proyek WON/LOST tidak
 * masuk daftar open — mereka sudah bukan keputusan.
 */

const STAGES = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'] as const;

export interface OpportunityBoardProps {
  opportunities: Opportunity[];
  /** Batas jumlah baris yang ditampilkan; sisanya dirujuk ke tabel. */
  limit?: number;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}const shortCode = (oppNumber: string) => oppNumber.replace(/^OPP-\d{4}-/, '');

export function OpportunityBoard({ opportunities, limit = 8, onSelect, selectedId }: OpportunityBoardProps) {
  const open = opportunities.filter((o) => o.stage !== 'WON' && o.stage !== 'LOST' && o.status === 'OPEN');
  const ranked = [...open].sort(
    (a, b) => Number(b.expectedValue) * b.probability - Number(a.expectedValue) * a.probability,
  );
  const shown = ranked.slice(0, limit);
  const rest = ranked.length - shown.length;

  if (ranked.length === 0) {
    return (
      <section aria-label="Open opportunities" className="border-t border-neutral-300">
        <p className="mb-2 mt-2 font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ OPEN OPPORTUNITIES ]</p>
        <p className="text-body-sm text-neutral-600">No open opportunities.</p>
      </section>
    );
  }

  return (
    <section aria-label="Open opportunities" className="border-t border-neutral-300">
      <div className="mb-2 mt-2 flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ OPEN OPPORTUNITIES ]</p>
        <p className="text-caption text-neutral-500">
          <span className="font-mono tabular-nums text-neutral-700">{ranked.length}</span> open · hottest first
        </p>
      </div>

      <ul className="divide-y divide-neutral-100 border-t border-neutral-200">
        {shown.map((o) => {
          const stageIdx = STAGES.indexOf(o.stage as (typeof STAGES)[number]);
          const isSelected = o.id === selectedId;
          return (
            <li key={o.id} className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 py-2.5 ${isSelected ? 'bg-neutral-50' : ''}`}>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelect?.(o.id)}
                  className="block max-w-full truncate text-left text-body-sm text-neutral-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800"
                  title={o.title}
                >
                  <span className="mr-2 font-mono text-caption text-neutral-500">{shortCode(o.oppNumber)}</span>
                  {o.title}
                </button>
                <p className="mt-0.5 font-mono text-caption tabular-nums text-neutral-600">
                  stage {stageIdx + 1} of {STAGES.length} · {o.probability}% · {o.client?.name}
                </p>
              </div>

              {/* Dot stepper: posisi stage, bukan besaran. */}
              <span role="img" aria-label={`Stage ${o.stage}, ${stageIdx + 1} of ${STAGES.length}`} className="flex items-center gap-1.5" aria-hidden="true">
                {STAGES.map((s, i) => (
                  <span key={s} className="flex items-center">
                    {i > 0 && <span className={`h-px w-3 ${i <= stageIdx ? 'bg-neutral-700' : 'bg-neutral-200'}`} />}
                    <span
                      className={`block rounded-full ${i < stageIdx ? 'h-1.5 w-1.5 bg-neutral-400' : i === stageIdx ? 'h-2.5 w-2.5 bg-neutral-900' : 'h-1.5 w-1.5 bg-neutral-200'}`}
                    />
                  </span>
                ))}
              </span>

              <span className="text-right">
                <span className="block font-mono text-body-sm tabular-nums text-neutral-950">
                  {formatIdrCompact(Number(o.expectedValue))}
                </span>
                <span className="block font-mono text-caption tabular-nums text-neutral-500">{o.stage}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {rest > 0 && (
        <p className="mt-2 text-caption text-neutral-500">
          {rest} more open opportunit{rest === 1 ? 'y' : 'ies'} — switch to the table view for the full list.
        </p>
      )}
    </section>
  );
}

