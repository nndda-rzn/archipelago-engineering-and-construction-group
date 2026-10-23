import type { HealthPortfolioItem } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';

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

const label = (h: HealthPortfolioItem['health']) =>
  h === 'ON_TRACK' ? 'On track' : h === 'AT_RISK' ? 'At risk' : h === 'CRITICAL' ? 'Critical' : 'No budget';

function Metric({ name, value, bad }: { name: string; value: string; bad?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-caption uppercase tracking-wide text-neutral-900/40">{name}</span>
      <span className={`font-mono text-body-sm tabular-nums ${bad ? 'text-racing-red-700' : 'text-neutral-900'}`}>{value}</span>
    </div>
  );
}

export function HealthRail({ items, selected, onClear }: HealthRailProps) {
  if (selected) {
    return (
      <aside aria-label="Project detail" className="min-w-0 border-l border-neutral-200 pl-4">
        <button
          type="button"
          onClick={onClear}
          className="text-caption uppercase tracking-wide text-neutral-900/40 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900"
        >
          ← All projects
        </button>

        <p className="mt-3 font-mono text-caption text-neutral-900/40">{selected.code}</p>
        <h2 className="mt-0.5 text-h3 text-neutral-950">{selected.name}</h2>
        <p className="mt-1 text-caption text-neutral-900/70">
          {label(selected.health)}
          {selected.partial && ' · schedule not assessed'}
        </p>

        <div className="mt-4 space-y-1.5">
          <Metric name="CPI" value={selected.cpi == null ? '—' : selected.cpi.toFixed(2)} bad={selected.cpi != null && selected.cpi < 1} />
          <Metric name="SPI" value={selected.spi == null ? 'n/a' : selected.spi.toFixed(2)} bad={selected.spi != null && selected.spi < 1} />
          <Metric name="Progress" value={`${selected.progressPercent}%`} />
          <Metric name="Utilization" value={selected.utilization == null ? '—' : `${selected.utilization}%`} />
        </div>

        <div className="mt-4 space-y-1.5 border-t border-neutral-200 pt-3">
          <Metric name="Budget" value={formatIdrCompact(selected.bac)} />
          <Metric name="Actual" value={formatIdrCompact(selected.ac)} />
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
    <aside aria-label="Needs attention" className="min-w-0 border-l border-neutral-200 pl-4">
      <p className="text-caption uppercase tracking-wide text-neutral-900/40">Needs attention</p>

      {needAction.length === 0 ? (
        <p className="mt-3 text-body-sm text-neutral-900/70">Every project with a budget is on track.</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {needAction.map((i) => (
            <li key={i.projectId}>
              <p className="font-mono text-caption text-neutral-900/40">{i.code}</p>
              <p className="text-body-sm text-neutral-900">{i.name}</p>
              <p className="mt-0.5 font-mono text-caption tabular-nums text-neutral-900/70">
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
