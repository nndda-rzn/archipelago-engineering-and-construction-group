import { cn } from '../lib/cn';

export interface TimeBandRow {
  id: string;
  label: string;
  /** ISO date; awal pita. */
  start: string;
  /** ISO date; `null` = masih berjalan. */
  end: string | null;
}

export interface TimeBandProps {
  /** Rentang sumbu (ISO date). */
  from: string;
  to: string;
  /** Posisi penanda "as of" (ISO date). */
  marker: string;
  onMarkerChange: (value: string) => void;
  bands: TimeBandRow[];
  className?: string;
}

const DAY = 86_400_000;

function pctOf(iso: string, fromMs: number, span: number): number {
  if (span <= 0) return 0;
  return Math.min(100, Math.max(0, ((new Date(iso).getTime() - fromMs) / span) * 100));
}

/**
 * Pita waktu (Gantt-like): tiap baris satu unit dengan pita `start → end`
 * (`end = null` melebar ke ujung kanan), garis "as of" yang bisa digeser.
 * Struktur dari garis + ruang, bukan kotak bertumpuk. `role="img"` +
 * `aria-label` memuat nama tiap pita.
 */
export function TimeBand({ from, to, marker, onMarkerChange, bands, className }: TimeBandProps) {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const span = toMs - fromMs;
  const markerPct = pctOf(marker, fromMs, span);

  const label = bands.length
    ? bands.map((b) => `${b.label} from ${b.start}${b.end ? ` to ${b.end}` : ' ongoing'}`).join(', ')
    : 'No units';

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-3">
        <label htmlFor="time-band-marker" className="text-caption text-neutral-500">
          As of
        </label>
        <input
          id="time-band-marker"
          type="date"
          value={marker.slice(0, 10)}
          min={from.slice(0, 10)}
          max={to.slice(0, 10)}
          onChange={(e) => onMarkerChange(e.target.value)}
          className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-body-sm text-neutral-900 focus-visible:border-racing-red-600 focus-visible:ring-2 focus-visible:ring-racing-red-600/20"
        />
      </div>

      <div role="img" aria-label={label} className="relative flex flex-col gap-1.5">
        {/* Garis "hari ini"/"as of" membentang seluruh baris */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 z-10 w-px bg-racing-red-600"
          style={{ left: `${markerPct}%` }}
        />
        {bands.map((b) => {
          const startPct = pctOf(b.start, fromMs, span);
          const endPct = b.end ? pctOf(b.end, fromMs, span) : 100;
          const width = Math.max(0.5, endPct - startPct);
          return (
            <div key={b.id} className="flex items-center gap-2">
              <span className="w-40 shrink-0 truncate text-body-sm text-neutral-700" title={b.label}>
                {b.label}
              </span>
              <span className="relative h-3 flex-1 rounded-sm bg-neutral-100">
                <span
                  data-slot="time-band"
                  className="absolute top-0 h-full rounded-sm bg-neutral-800"
                  style={{ left: `${startPct}%`, width: `${width}%` }}
                  title={`${b.label}: ${b.start.slice(0, 10)} – ${b.end ? b.end.slice(0, 10) : 'ongoing'}`}
                />
              </span>
            </div>
          );
        })}
        {bands.length === 0 && <p className="text-body-sm text-neutral-500">No units in this scope.</p>}
      </div>
      <p className="text-caption text-neutral-500">
        Marker: <span className="font-mono tabular-nums">{marker.slice(0, 10)}</span>
      </p>
    </div>
  );
}

export { DAY as TIME_BAND_DAY_MS };
