import { cn } from '../lib/cn';

export interface WaterfallInput {
  contract: number;
  budget: number;
  actual: number;
}

export interface WaterfallSegment {
  label: string;
  /** Perubahan bertanda pada segmen ini (negatif = turun). */
  value: number;
  /** Posisi awal (nilai berjalan) sebelum segmen ini. */
  start: number;
  /** Posisi akhir setelah segmen ini. */
  end: number;
  /** `total` = batang nilai absolut; `delta` = batang perubahan. */
  kind: 'total' | 'delta';
  direction: 'up' | 'down' | 'flat';
}

const directionOf = (v: number): 'up' | 'down' | 'flat' => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat');

/**
 * Susun "bridge" Contract → Budget → Actual → Variance sebagai segmen waterfall.
 * Segmen pertama (Contract) & terakhir (Variance) adalah nilai absolut; dua di
 * tengah adalah selisih bertanda. Nilai berjalan (`start`/`end`) disimpan agar
 * batang bisa diposisikan tanpa menghitung ulang di komponen.
 *
 * Semua nilai dijaga finite walau contract/budget 0 (tanpa pembagian nol).
 */
export function waterfallSegments({ contract, budget, actual }: WaterfallInput): WaterfallSegment[] {
  const variance = budget - actual;
  return [
    { label: 'Contract', value: contract, start: 0, end: contract, kind: 'total', direction: directionOf(contract) },
    { label: 'Budget', value: budget - contract, start: contract, end: budget, kind: 'delta', direction: directionOf(budget - contract) },
    { label: 'Actual', value: actual - budget, start: budget, end: actual, kind: 'delta', direction: directionOf(actual - budget) },
    { label: 'Variance', value: variance, start: actual, end: actual + variance, kind: 'total', direction: directionOf(variance) },
  ];
}

export interface WaterfallProps extends WaterfallInput {
  /** Format angka untuk label; default `String`. */
  format?: (n: number) => string;
  className?: string;
}

const BAR_CLASS: Record<'up' | 'down' | 'flat', string> = {
  up: 'bg-financial-positive-500',
  down: 'bg-financial-negative-500',
  flat: 'bg-neutral-400',
};

const TOTAL_CLASS = 'bg-neutral-800';

/**
 * Waterfall horizontal: menunjukkan bagaimana Contract berubah menjadi Variance
 * melalui Budget dan Actual. Batang "total" (Contract/Variance) netral; batang
 * "delta" berwarna menurut arah (turun = negatif). Aksesibel via `role="img"` +
 * aria-label berisi seluruh tahap.
 */
export function Waterfall({ contract, budget, actual, format = String, className }: WaterfallProps) {
  const segments = waterfallSegments({ contract, budget, actual });
  const max = Math.max(contract, budget, actual, Math.abs(actual + (actual - budget)), 1);

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="img"
        aria-label={segments.map((s) => `${s.label} ${format(Math.abs(s.value))}`).join(', ')}
        className="space-y-1.5"
      >
        {segments.map((s) => {
          const widthPct = Math.min(100, (Math.abs(s.value) / max) * 100);
          const offsetPct = Math.min(100, (Math.min(s.start, s.end) / max) * 100);
          return (
            <div key={s.label} className="grid grid-cols-[6rem_1fr] items-center gap-3">
              <span className="text-body-sm text-neutral-600">{s.label}</span>
              <div className="relative h-3 w-full overflow-hidden rounded-sm bg-neutral-100">
                <div
                  data-slot="waterfall-bar"
                  data-direction={s.direction}
                  className={cn('absolute inset-y-0 rounded-sm', s.kind === 'total' ? TOTAL_CLASS : BAR_CLASS[s.direction])}
                  style={{ left: `${offsetPct}%`, width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
