import type { Contract, Client } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';

/**
 * Section 3 — Contract Book. Encoding: SATU stacked bar komposisi di atas,
 * lalu daftar baris mono tanpa grafik.
 *
 * Bar komposisi muncul SEKALI di section ini karena ia menjawab satu pertanyaan:
 * "berapa porsi book yang sudah dieksekusi vs masih draft". Mengulang bar per
 * baris adalah pola mosaik yang membuat halaman terasa template.
 */

export interface ContractBookProps {
  contracts: Contract[];
  clients: Client[];
}

const CONTRACT_TYPE_LABEL: Record<string, string> = {
  LUMP_SUM: 'Lump sum',
  UNIT_PRICE: 'Unit price',
  COST_PLUS: 'Cost plus',
  TIME_MATERIAL: 'Time & material',
};

export function ContractBook({ contracts, clients }: ContractBookProps) {
  const executed = contracts.filter((c) => c.status === 'EXECUTED');
  const draft = contracts.filter((c) => c.status === 'DRAFT');
  const executedValue = executed.reduce((s, c) => s + Number(c.value), 0);
  const draftValue = draft.reduce((s, c) => s + Number(c.value), 0);
  const total = executedValue + draftValue;
  const executedPct = total > 0 ? Math.round((executedValue / total) * 100) : 0;

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—';

  const rows = [...draft, ...executed];

  return (
    <section aria-label="Contract book" className="border-t border-neutral-300">
      <div className="mb-2 mt-2 flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ CONTRACT BOOK ]</p>
        <p className="text-caption text-neutral-500">
          <span className="font-mono tabular-nums text-neutral-700">{contracts.length}</span> contract
          {contracts.length === 1 ? '' : 's'}
        </p>
      </div>

      {contracts.length === 0 ? (
        <p className="text-body-sm text-neutral-600">No contracts yet.</p>
      ) : (
        <>
          {/* Satu-satunya bar di section ini: komposisi executed vs draft. */}
          <div className="flex items-center gap-3">
            <span
              role="img"
              aria-label={`Executed ${executed.length} contracts ${formatIdrCompact(executedValue)} (${executedPct}%), draft ${draft.length} ${formatIdrCompact(draftValue)}`}
              className="relative h-3 flex-1 overflow-hidden rounded-sm bg-neutral-100"
            >
              <span className="absolute inset-y-0 left-0 bg-neutral-800" style={{ width: `${executedPct}%` }} />
            </span>
            <span className="shrink-0 font-mono text-caption tabular-nums text-neutral-600">
              {executed.length} × {formatIdrCompact(executedValue)} ({executedPct}%) · {draft.length} ×{' '}
              {formatIdrCompact(draftValue)} ({100 - executedPct}%)
            </span>
          </div>

          <ul className="mt-3 divide-y divide-neutral-100 border-t border-neutral-200">
            {rows.map((c: Contract) => (
              <li key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-baseline gap-x-4 py-2">
                <span className="font-mono text-caption text-neutral-500">{c.contractNumber}</span>
                <span className="min-w-0 truncate text-body-sm text-neutral-900" title={c.title}>
                  {c.title}
                  <span className="ml-2 text-caption text-neutral-500">{clientName(c.clientId)}</span>
                </span>
                <span className="font-mono text-caption uppercase tracking-wide text-neutral-500">
                  {CONTRACT_TYPE_LABEL[c.contractType] ?? c.contractType}
                </span>
                <span className="w-24 text-right font-mono text-body-sm tabular-nums text-neutral-950">
                  {formatIdrCompact(Number(c.value))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-neutral-500">
            Advance {executed[0]?.advanceTerm ?? 0}% · retention {executed[0]?.retentionTerm ?? 0}% — terms per contract
            type are indicative for this portfolio view.
          </p>
        </>
      )}
    </section>
  );
}

