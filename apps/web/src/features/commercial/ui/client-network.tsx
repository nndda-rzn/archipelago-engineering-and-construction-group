import type { Client, Opportunity, Contract } from '@aec/api-contracts';
import { StatusPill } from '@aec/ui';

/**
 * Section 4 — Client Network. Encoding: kartu strip relasional, tanpa grafik.
 *
 * Yang membuat client bermakna bukan atributnya sendiri, tapi RELASINYA: berapa
 * opportunity dan contract yang menggantung pada namanya. Jumlah itu ditulis
 * sebagai teks mono — grafik di sini hanya menambah noise.
 */

export interface ClientNetworkProps {
  clients: Client[];
  opportunities: Opportunity[];
  contracts: Contract[];
}

const INDUSTRY_LABEL: Record<string, string> = {
  OIL_GAS: 'Oil & gas',
  MARINE: 'Marine',
  POWER: 'Power',
  CONSTRUCTION: 'Construction',
};

export function ClientNetwork({ clients, opportunities, contracts }: ClientNetworkProps) {
  return (
    <section aria-label="Clients" className="border-t border-neutral-300">
      <div className="mb-2 mt-2 flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ CLIENTS ]</p>
        <p className="text-caption text-neutral-500">
          <span className="font-mono tabular-nums text-neutral-700">{clients.length}</span> client
          {clients.length === 1 ? '' : 's'}
        </p>
      </div>

      {clients.length === 0 ? (
        <p className="text-body-sm text-neutral-600">No clients yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) => {
            const opps = opportunities.filter((o) => o.clientId === c.id);
            const openOpps = opps.filter((o) => o.status === 'OPEN').length;
            const ctrs = contracts.filter((x) => x.clientId === c.id);
            return (
              <li key={c.id} className="rounded-md border border-neutral-200 bg-surface-raised p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-body font-semibold text-neutral-950" title={c.name}>{c.name}</p>
                    <p className="mt-0.5 font-mono text-caption text-neutral-500">{c.clientCode}</p>
                  </div>
                  <StatusPill
                    tone={c.status === 'ACTIVE' ? 'positive' : 'neutral'}
                    label={c.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  />
                </div>
                <p className="mt-1 text-caption text-neutral-600">
                  {INDUSTRY_LABEL[c.industry ?? ''] ?? c.industry ?? '—'} · {c.country}
                </p>
                <p className="mt-2 border-t border-neutral-100 pt-2 font-mono text-caption tabular-nums text-neutral-700">
                  {opps.length} opportunit{opps.length === 1 ? 'y' : 'ies'}
                  {openOpps > 0 ? ` (${openOpps} open)` : ''} · {ctrs.length} contract{ctrs.length === 1 ? '' : 's'}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
