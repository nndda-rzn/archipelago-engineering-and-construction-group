import { cn } from '../lib/cn';

export interface SegmentRulerSegment {
  id: string;
  label: string;
  /** Batas bawah (inklusif). */
  from: number;
  /** Batas atas (eksklusif); `null` = tak terbatas. */
  to: number | null;
}

export interface SegmentRulerMarker {
  from: number;
  to: number | null;
}

export interface SegmentRulerProps {
  /** Domain skala bersama `[min, max]`. `max` boleh `Infinity`. */
  domain: [number, number];
  segments: SegmentRulerSegment[];
  /** Penanda tumpang tindih/celah (digambar sebagai pita tipis di atas segmen). */
  markers?: SegmentRulerMarker[];
  format?: (n: number) => string;
  className?: string;
}

const TONE = ['bg-neutral-800', 'bg-neutral-500', 'bg-neutral-300'];

function clampPct(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 100;
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

/**
 * Pita berskala dengan segmen berlabel pada satu sumbu numerik bersama — dipakai
 * untuk "tangga wewenang" (rentang nominal → level approver). Segmen `to = null`
 * digambar sampai ujung kanan. `role="img"` + `aria-label` memuat seluruh label
 * segmen, jadi nilainya terbaca tanpa mengandalkan warna.
 */
export function SegmentRuler({ domain, segments, markers = [], format = String, className }: SegmentRulerProps) {
  const [min, max] = domain;
  const finiteMax = Number.isFinite(max) ? max : min + Math.max(1, min) * 2;
  const scaleMax = finiteMax > min ? finiteMax : min + 1;

  const label = segments.length
    ? segments.map((s) => `${s.label} ${format(s.from)}–${s.to == null ? '∞' : format(s.to)}`).join(', ')
    : 'No segments';

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div role="img" aria-label={label} className="relative h-8 w-full overflow-hidden rounded-sm bg-neutral-100">
        {segments.map((s, i) => {
          const left = clampPct(s.from, min, scaleMax);
          const right = s.to == null ? 100 : clampPct(s.to, min, scaleMax);
          const width = Math.max(0, right - left);
          return (
            <div
              key={s.id}
              data-slot="segment"
              data-label={s.label}
              className={cn('absolute top-0 h-full', TONE[i % TONE.length])}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${s.label}: ${format(s.from)} – ${s.to == null ? '∞' : format(s.to)}`}
            />
          );
        })}
        {markers.map((m, i) => {
          const left = clampPct(m.from, min, scaleMax);
          const right = m.to == null ? 100 : clampPct(m.to, min, scaleMax);
          return (
            <div
              key={`marker-${i}`}
              data-slot="segment-marker"
              aria-hidden="true"
              className="absolute bottom-0 h-1.5 border-x border-warning-700 bg-warning-500/40"
              style={{ left: `${left}%`, width: `${Math.max(0, right - left)}%` }}
            />
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s, i) => (
          <li key={s.id} className="flex items-center gap-1.5 text-caption text-neutral-600">
            <span className={cn('inline-block h-2 w-2 rounded-full', TONE[i % TONE.length])} aria-hidden="true" />
            <span>{s.label}</span>
            <span className="font-mono tabular-nums text-neutral-500">
              {format(s.from)}–{s.to == null ? '∞' : format(s.to)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
