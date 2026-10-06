import { cn } from '@aec/ui';
import type { AgingBucket } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';

/** Urgensi naik dari CURRENT ke 90+ — warna mengikuti token, teks tetap sinyal utama. */
const BUCKET_TONE: Record<string, string> = {
  CURRENT: 'bg-neutral-300',
  '1-30': 'bg-neutral-400',
  '31-60': 'bg-warning-400',
  '61-90': 'bg-warning-600',
  '90+': 'bg-destructive-600',
};

export interface AgingBucketBarsProps {
  buckets: AgingBucket[];
  /** Bucket yang sedang dipilih (untuk drill-down). */
  selected?: string;
  onSelect?: (bucket: string) => void;
  label: string;
}

/**
 * Baris horizontal per bucket aging — **ranking** umur (bukan pie): panjang relatif
 * terhadap bucket terbesar, jadi "seberapa telat" langsung terbaca. Setiap baris
 * adalah tombol yang membuka daftar invoice di baliknya.
 */
export function AgingBucketBars({ buckets, selected, onSelect, label }: AgingBucketBarsProps) {
  const max = Math.max(...buckets.map((b) => b.amount), 0);

  return (
    <ul className="space-y-1">
      {buckets.map((b) => {
        const pct = max > 0 ? (b.amount / max) * 100 : 0;
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
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className={cn('w-32 shrink-0 text-right font-mono text-caption tabular-nums', b.amount > 0 ? 'text-neutral-800' : 'text-neutral-400')}>
                {formatIdr(b.amount)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
