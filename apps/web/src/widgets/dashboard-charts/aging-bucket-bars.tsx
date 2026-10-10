import { cn } from '@aec/ui';
import type { AgingBucket } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { Money } from '@/shared/ui/money';

/** Urgensi naik dari CURRENT ke 90+ — warna mengikuti token, teks tetap sinyal utama. */
const BUCKET_TONE: Record<string, string> = {
  CURRENT: 'bg-neutral-300',
  '1-30': 'bg-neutral-400',
  '31-60': 'bg-warning-400',
  '61-90': 'bg-warning-600',
  '90+': 'bg-destructive-600',
};

/** Lebar minimum bar (persen) agar bucket kecil tetap terlihat saat ada outlier. */
const MIN_BAR_PCT = 2;

export interface AgingBucketBarsProps {
  buckets: AgingBucket[];
  /** Bucket yang sedang dipilih (untuk drill-down). */
  selected?: string;
  onSelect?: (bucket: string) => void;
  label: string;
}

/**
 * Baris horizontal per bucket aging. Panjang bar = **porsi dari total** (semua bar
 * berjumlah 100%), bukan relatif ke bucket terbesar — supaya satu invoice outlier
 * raksasa tidak menghancurkan skala bucket lain. Bucket kecil tetap diberi lebar
 * minimum agar terbaca. Angka ditampilkan **ringkas** (`Rp 6,25 T`) dengan nominal
 * penuh di `title`/`aria-label`; sebelumnya `formatIdr` penuh meluap keluar kartu.
 */
export function AgingBucketBars({ buckets, selected, onSelect, label }: AgingBucketBarsProps) {
  const total = buckets.reduce((s, b) => s + b.amount, 0);

  return (
    <ul className="space-y-1">
      {buckets.map((b) => {
        const share = total > 0 ? (b.amount / total) * 100 : 0;
        const width = b.amount > 0 ? Math.max(MIN_BAR_PCT, share) : 0;
        const isSelected = selected === b.bucket;
        return (
          <li key={b.bucket}>
            <button
              type="button"
              aria-pressed={isSelected}
              disabled={b.amount <= 0}
              onClick={() => onSelect?.(isSelected ? '' : b.bucket)}
              className={cn(
                'grid w-full grid-cols-[4.5rem_1fr_auto] items-center gap-2 rounded px-1 py-0.5 text-left transition-colors duration-fast',
                'disabled:cursor-default',
                isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50',
              )}
              aria-label={`${label} ${b.bucket}: ${formatIdr(b.amount)}`}
            >
              <span className={cn('font-mono text-caption tabular-nums', b.amount > 0 ? 'text-neutral-600' : 'text-neutral-400')}>
                {b.bucket}
              </span>
              <span className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <span
                  data-slot="aging-bucket-fill"
                  className={cn('block h-full rounded-full', BUCKET_TONE[b.bucket] ?? 'bg-neutral-400')}
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
                <span className="w-10 text-right font-mono text-caption tabular-nums text-neutral-400">
                  {b.amount > 0 ? `${share < 10 ? share.toFixed(1) : Math.round(share)}%` : ''}
                </span>
                <Money
                  value={b.amount}
                  className={cn('text-right font-mono text-caption tabular-nums', b.amount > 0 ? 'text-neutral-800' : 'text-neutral-400')}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
