import { formatIdr } from '@/shared/lib/format';

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

const TONE: Record<WaterfallStep['kind'], string> = {
  base: '#71717a', // neutral-500
  pos: '#15803d', // success-700
  neg: '#b91c1c', // destructive-700
  total: '#27272a', // neutral-800
};

/**
 * Jembatan kas (waterfall): menunjukkan **bagaimana** kas berubah, bukan hanya
 * berapa. Opening + collections − payments = closing. Aksesibel via tabel sr-only
 * + `role="img"` dengan ringkasan nilai.
 */
export function WaterfallChart({ steps }: { steps: WaterfallStep[] }) {
  const segs = waterfallSegments(steps);
  const max = Math.max(...segs.map((s) => Math.max(s.from, s.to)), 1);
  const summary = segs.map((s) => `${s.label} ${formatIdr(s.value)}`).join(', ');

  return (
    <div role="img" aria-label={`Cash bridge: ${summary}`}>
      <div className="flex h-44 items-end gap-3">
        {segs.map((s) => {
          const top = Math.min(s.from, s.to);
          const height = Math.max(2, Math.abs(s.to - s.from));
          const topPct = 100 - (top / max) * 100;
          const heightPct = (height / max) * 100;
          return (
            <div key={s.label} className="flex flex-1 flex-col items-center justify-end">
              <span className="mb-1 font-mono text-caption tabular-nums text-neutral-500">
                {s.kind === 'pos' ? `+${formatIdr(s.value)}` : s.kind === 'neg' ? formatIdr(s.value) : formatIdr(s.value)}
              </span>
              <div className="relative w-full flex-1">
                <div
                  data-slot="waterfall-bar"
                  className="absolute w-full rounded-sm"
                  style={{ top: `${topPct}%`, height: `${heightPct}%`, backgroundColor: TONE[s.kind] }}
                />
              </div>
              <span className="mt-1.5 text-caption text-neutral-500">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
