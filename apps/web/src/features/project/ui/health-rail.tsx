import type { HealthPortfolioItem } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';

/** Label yang dapat dibaca manusia untuk tiap tingkat health portofolio. */
export const healthLabel: Record<HealthPortfolioItem['health'], string> = {
  NO_BUDGET: 'No Budget',
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  CRITICAL: 'Critical',
};

/**
 * Rail kanan: daftar yang perlu tindakan, atau detail proyek terpilih.
 *
 * Dua keadaan, satu tempat. Saat tidak ada yang dipilih, rail menjawab "apa
 * yang harus saya kerjakan". Saat sebuah titik diklik, rail menjawab "mengapa
 * proyek ini begitu" — tanpa modal, tanpa halaman baru.
 */
export interface HealthRailProps {
  items: HealthPortfolioItem[];
  selected: HealthPortfolioItem | null;
  onClear: () => void;
}

function Metric({ name, value, bad }: { name: string; value: string; bad?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-caption uppercase tracking-wide text-neutral-500">{name}</span>
      <span className={`font-mono text-body-sm tabular-nums ${bad ? 'text-destructive-700' : 'text-neutral-900'}`}>{value}</span>
    </div>
  );
}

export function HealthRail({ items, selected, onClear }: HealthRailProps) {
  if (selected) {
    return (
      <aside aria-label="Project detail" className="border-t border-neutral-300">
        <p className="mb-2 mt-2 font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ DETAIL PROYEK ]</p>
        <button
          type="button"
          onClick={onClear}
          className="text-caption uppercase tracking-wide text-neutral-500 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900"
        >
          ← All projects
        </button>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-4">
          <p className="font-mono text-caption text-neutral-500">{selected.code}</p>
          <h2 className="text-h3 text-neutral-950">{selected.name}</h2>
          <p className="text-caption text-neutral-600">
            {healthLabel[selected.health]}
            {selected.partial && ' · schedule not assessed'}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5">
          <Metric name="CPI" value={selected.cpi == null ? '—' : selected.cpi.toFixed(2)} bad={selected.cpi != null && selected.cpi < 1} />
          <Metric name="SPI" value={selected.spi == null ? 'n/a' : selected.spi.toFixed(2)} bad={selected.spi != null && selected.spi < 1} />
          <Metric name="Utilization" value={selected.utilization == null ? '—' : `${selected.utilization}%`} />
          <Metric name="Budget" value={formatIdrCompact(selected.bac)} />
          <Metric name="Actual" value={formatIdrCompact(selected.ac)} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-x-8 gap-y-1.5 border-t border-neutral-200 pt-3 lg:grid-cols-3">
          <Metric name="Open NCRs" value={String(selected.ncrs)} bad={selected.ncrs > 0} />
          <Metric name="Incidents" value={String(selected.incidents)} bad={selected.incidents > 0} />
          <Metric name="Open risks" value={String(selected.risks)} bad={selected.risks > 0} />
        </div>
      </aside>
    );
  }

  const needAction = items
    .filter((i) => i.health === 'AT_RISK' || i.health === 'CRITICAL')
    .sort((a, b) => (a.cpi ?? 9) - (b.cpi ?? 9));

  return (
    <aside aria-label="Needs attention" className="border-t border-neutral-300">
      <p className="mb-2 mt-2 font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ PERLU TINDAKAN ]</p>

      {needAction.length === 0 ? (
        <p className="text-body-sm text-neutral-600">Every project with a budget is on track.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
          {needAction.map((i) => (
            <li key={i.projectId} className="min-w-0">
              <p className="font-mono text-caption text-neutral-500">{i.code}</p>
              <p className="truncate text-body-sm text-neutral-900" title={i.name}>{i.name}</p>
              <p className="mt-0.5 font-mono text-caption tabular-nums text-neutral-600">
                CPI {i.cpi == null ? '—' : i.cpi.toFixed(2)} · SPI {i.spi == null ? 'n/a' : i.spi.toFixed(2)}
                {i.ncrs > 0 && ` · ${i.ncrs} NCR`}
                {i.incidents > 0 && ` · ${i.incidents} incident`}
                {i.risks > 0 && ` · ${i.risks} risk`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}



