import { formatIdr, formatIdrCompact } from '@/shared/lib/format';

/**
 * Satu sel variance bertanda.
 *
 * Tanda `+`/`−` ditulis sebagai teks, bukan hanya warna: sekitar 8% pria tidak
 * dapat membedakan merah-hijau, dan selisih biaya adalah informasi yang tidak
 * boleh bergantung pada persepsi warna. Bilah di bawahnya hanya penguat — arah
 * ditunjukkan oleh sisi tempat bilah tumbuh, bukan oleh hue.
 */
export interface VarianceCellProps {
  value: number;
  /** Selisih terbesar yang terlihat, untuk menskalakan bilah. */
  max: number;
  label: string;
}

const MINUS = '−';

export function VarianceCell({ value, max, label }: VarianceCellProps) {
  const sign = value > 0 ? '+' : value < 0 ? MINUS : '';
  const pct = max > 0 ? Math.min(100, Math.round((Math.abs(value) / max) * 100)) : 0;

  return (
    <span className="flex flex-col items-end gap-1">
      <span
        className={`font-mono text-body-sm tabular-nums ${value < 0 ? 'text-destructive-700' : 'text-neutral-800'}`}
        title={`${label}: ${formatIdr(value)}`}
      >
        {sign}
        {formatIdrCompact(Math.abs(value))}
      </span>
      {max > 0 && (
        <span
          role="img"
          aria-label={`${label}: ${formatIdr(value)}`}
          className="flex h-1 w-full bg-neutral-100"
        >
          <span
            data-testid="variance-bar"
            className="h-full bg-neutral-600"
            style={{ width: `${pct}%`, marginLeft: value < 0 ? 'auto' : undefined }}
          />
        </span>
      )}
    </span>
  );
}
