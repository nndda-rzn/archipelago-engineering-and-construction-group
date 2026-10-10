import { EmptyState } from '@aec/ui';
import type { FiscalPeriod } from '@aec/api-contracts';

/** Warna status periode — ramp dari netral (future) ke gelap (locked). */
const STATUS_TILE: Record<string, string> = {
  FUTURE: 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300',
  OPEN: 'border-success-300 bg-success-50 text-success-800 hover:border-success-400',
  SOFT_CLOSED: 'border-warning-300 bg-warning-50 text-warning-800 hover:border-warning-400',
  CLOSED: 'border-neutral-300 bg-neutral-100 text-neutral-700 hover:border-neutral-400',
  LOCKED: 'border-neutral-800 bg-neutral-800 text-white hover:bg-neutral-700',
};

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const FISCAL_STATUSES = ['FUTURE', 'OPEN', 'SOFT_CLOSED', 'CLOSED', 'LOCKED'] as const;

/** Legenda warna status — dipakai di samping kalender. */
export function FiscalStatusLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {FISCAL_STATUSES.map((s) => (
        <li key={s} className="flex items-center gap-1.5 text-caption text-neutral-600">
          <span className={`inline-block h-3 w-3 rounded-sm border ${STATUS_TILE[s]}`} aria-hidden="true" />
          {s}
        </li>
      ))}
    </ul>
  );
}

export interface FiscalPeriodCalendarProps {
  periods: FiscalPeriod[];
  selectedId?: string;
  onSelect: (period: FiscalPeriod) => void;
}

/**
 * Kalender periode fiskal: satu tile per bulan, diwarnai menurut status. Mengganti
 * tabel datar dengan tampilan yang langsung terbaca (bulan mana terbuka, mana
 * terkunci). Tiap tile adalah tombol yang membuka panel transisi.
 */
export function FiscalPeriodCalendar({ periods, selectedId, onSelect }: FiscalPeriodCalendarProps) {
  if (periods.length === 0) {
    return <EmptyState title="No fiscal periods" description="Create a fiscal period to open the calendar." />;
  }
  const sorted = [...periods].sort((a, b) => a.periodMonth - b.periodMonth);
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {sorted.map((p) => {
        const selected = p.id === selectedId;
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={selected}
            aria-label={`${p.periodCode}: ${p.status}`}
            onClick={() => onSelect(p)}
            className={`flex flex-col items-start gap-1 rounded-md border px-2.5 py-2 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/40 ${
              STATUS_TILE[p.status] ?? STATUS_TILE.FUTURE
            } ${selected ? 'ring-2 ring-racing-red-600' : ''}`}
          >
            <span className="text-overline uppercase opacity-70">{MONTH_ABBR[p.periodMonth - 1]}</span>
            <span className="font-mono text-body-sm font-medium">{p.periodCode}</span>
            <span className="text-caption opacity-80">{p.status}</span>
          </button>
        );
      })}
    </div>
  );
}
