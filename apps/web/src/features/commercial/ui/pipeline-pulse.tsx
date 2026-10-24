import type { CommercialSummary } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';

/**
 * Section 1 — Pipeline Pulse. Encoding: angka ledger + mini-funnel tipis.
 *
 * Empat angka besar dipisah hairline vertikal (bukan kartu), dan funnel muncul
 * sebagai pita tipis 2px per stage — indikator distribusi yang dapat diklik,
 * bukan grafik utama. Dulu section ini empat kartu metrik seragam: tampilan
 * "mosaik kartu" itulah yang membuat halaman terasa template.
 */

const FUNNEL_STAGES = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'] as const;

export interface PipelinePulseProps {
  summary: CommercialSummary;
  /** Stage funnel yang dipilih (klik) — `null` = tanpa filter. */
  selectedStage: string | null;
  onSelectStage: (stage: string | null) => void;
}

function Cell({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0 border-l border-neutral-200 pl-4 first:border-l-0 first:pl-0">
      <p className="text-caption uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-metric tabular-nums text-neutral-950">{value}</p>
      {children}
    </div>
  );
}

function SubLine({ items }: { items: string[] }) {
  return (
    <p className="mt-1 text-caption text-neutral-600">
      {items.map((t, i) => (
        <span key={t}>
          {i > 0 && <span className="mx-1 text-neutral-300">·</span>}
          <span className={t.startsWith('▲') || t.startsWith('▼') ? 'font-medium text-neutral-800' : undefined}>{t}</span>
        </span>
      ))}
    </p>
  );
}

export function PipelinePulse({ summary, selectedStage, onSelectStage }: PipelinePulseProps) {
  const { pipelineValue, openOpportunities, winRatePct, contractBook, funnel } = summary;

  const maxFunnel = Math.max(...funnel.map((f) => f.value), 1);
  const totalFunnelValue = funnel.reduce((s, f) => s + f.value, 0);

  return (
    <section aria-label="Pipeline pulse" className="border-t border-neutral-300">
      <div className="mb-2 mt-2 flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ PIPELINE PULSE ]</p>
      </div>

      <div className="grid grid-cols-2 gap-y-4 lg:grid-cols-4">
        <Cell label="Pipeline value" value={formatIdrCompact(pipelineValue)}>
          <SubLine items={[`${openOpportunities} open`]} />
        </Cell>
        <Cell label="Open opportunities" value={String(openOpportunities)} />
        <Cell label="Win rate" value={winRatePct == null ? '—' : `${Math.round(winRatePct)}%`}>
          <SubLine items={[`▲ won ${formatIdrCompact(summary.wonValue)}`, `lost ${formatIdrCompact(summary.lostValue)}`]} />
        </Cell>
        <Cell label="Contract book" value={formatIdrCompact(contractBook.executedValue)}>
          <SubLine items={[`${contractBook.executedCount} executed`, `${contractBook.draftCount} draft`]} />
        </Cell>
      </div>

      {/* Mini-funnel: pita 2px per stage, klik = filter daftar opportunity. */}
      <div className="mt-4 border-t border-neutral-200 pt-3" role="group" aria-label="Pipeline funnel by stage">
        <p className="text-caption text-neutral-600">
          Funnel · total open {formatIdrCompact(totalFunnelValue)} — click a stage to filter
        </p>
        <ul className="mt-2 space-y-1.5">
          {FUNNEL_STAGES.map((stage) => {
            const entry = funnel.find((f) => f.stage === stage);
            const count = entry?.count ?? 0;
            const value = entry?.value ?? 0;
            const width = (value / maxFunnel) * 100;
            const selected = selectedStage === stage;
            return (
              <li key={stage}>
                <button
                  type="button"
                  onClick={() => onSelectStage(selected ? null : stage)}
                  aria-pressed={selected}
                  className={`group flex w-full items-baseline gap-3 rounded px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800 ${selected ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
                >
                  <span className={`w-28 shrink-0 font-mono text-caption uppercase tracking-wide ${selected ? 'text-neutral-950' : 'text-neutral-500'}`}>
                    {stage}
                  </span>
                  <span className="relative h-0.5 flex-1 bg-neutral-100" aria-hidden="true">
                    <span
                      className={`absolute inset-y-0 left-0 ${selected ? 'bg-neutral-900' : 'bg-neutral-400'} group-hover:bg-neutral-800`}
                      style={{ width: `${width}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-700">{count}</span>
                  <span className="w-20 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-600">
                    {value > 0 ? formatIdrCompact(value) : '—'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

