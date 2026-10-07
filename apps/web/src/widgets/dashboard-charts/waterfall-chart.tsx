import { cn } from '@aec/ui';
import { formatIdrAxis } from '@/shared/lib/format';
import { CHART } from './chart-colors';

export interface WaterfallStep {
  label: string;
  /** Nilai mutlak (opening/closing) atau delta bertanda (in/out). */
  value: number;
  /** `base`/`total` = batang penuh dari nol; `pos`/`neg` = mengambang. */
  kind: 'base' | 'pos' | 'neg' | 'total';
}

export interface WaterfallSegment extends WaterfallStep {
  from: number;
  to: number;
}

/**
 * Hitung posisi tiap segmen jembatan kas: opening → collections → payments →
 * closing. Segmen `pos`/`neg` mengambang dari nilai berjalan; `base`/`total`
 * duduk dari nol.
 */
export function waterfallSegments(steps: WaterfallStep[]): WaterfallSegment[] {
  let running = 0;
  return steps.map((s) => {
    if (s.kind === 'base' || s.kind === 'total') {
      running = s.value;
      return { ...s, from: 0, to: s.value };
    }
    const from = running;
    running += s.value;
    return { ...s, from, to: running };
  });
}

/** Warna dari token bersama (tanpa hex di komponen). */
const TONE: Record<WaterfallStep['kind'], string> = {
  base: CHART.axis, // neutral
  pos: CHART.positive,
  neg: CHART.negative,
  total: CHART.strong,
};

/**
 * Jembatan kas (waterfall **horizontal**): menunjukkan **bagaimana** kas berubah
 * dari Opening ke Closing melalui Collections (+) dan Payments (−). Horizontal
 * dipilih agar label tahap + nilai rata kanan tetap terbaca di kartu sempit.
 * Aksesibel via `role="img"` + aria-label berisi seluruh tahap.
 */
export function WaterfallChart({ steps, className }: { steps: WaterfallStep[]; className?: string }) {
  const segs = waterfallSegments(steps);
  const max = Math.max(...segs.map((s) => Math.max(s.from, s.to)), 1);
  const summary = segs.map((s) => `${s.label} ${formatIdrAxis(s.value)}`).join(', ');
  const pct = (v: number) => Math.min(100, Math.max(0, (v / max) * 100));

  return (
    <div role="img" aria-label={`Cash bridge: ${summary}`} className={cn('space-y-2', className)}>
      {segs.map((s) => {
        const startPct = pct(Math.min(s.from, s.to));
        const widthPct = Math.max(1, pct(Math.abs(s.to - s.from)));
        const valueLabel =
          s.kind === 'pos'
            ? `+${formatIdrAxis(Math.abs(s.value))}`
            : s.kind === 'neg'
              ? `−${formatIdrAxis(Math.abs(s.value))}`
              : formatIdrAxis(s.value);
        return (
          <div key={s.label} className="grid grid-cols-[7rem_1fr_5.5rem] items-center gap-2.5">
            <span className="truncate text-caption text-neutral-600" title={s.label}>
              {s.label}
            </span>
            <span className="relative h-4 w-full overflow-hidden rounded-sm bg-neutral-100">
              <span
                data-slot="waterfall-bar"
                data-kind={s.kind}
                className="absolute inset-y-0 rounded-sm"
                style={{ left: `${startPct}%`, width: `${widthPct}%`, backgroundColor: TONE[s.kind] }}
              />
            </span>
            <span className="text-right font-mono text-caption tabular-nums text-neutral-700">{valueLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
