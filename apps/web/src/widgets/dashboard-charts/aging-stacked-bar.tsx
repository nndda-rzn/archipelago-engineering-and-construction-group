import { AGING_COLORS } from './chart-colors';
import { formatIdr } from '@/shared/lib/format';

export interface AgingStackedBarProps {
  buckets: { bucket: string; amount: number }[];
  label: string;
}

/**
 * Batang tersegmentasi bucket aging (AR/AP) dengan legenda per bucket.
 * Aksesibel via `role="img"` + aria-label berisi nilai setiap bucket.
 */
export function AgingStackedBar({ buckets, label }: AgingStackedBarProps) {
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  if (total <= 0) {
    return <p className="text-body-sm text-neutral-500">No outstanding {label}.</p>;
  }

  return (
    <div>
      <div
        role="img"
        aria-label={`${label}: ${buckets.map((b) => `${b.bucket} ${formatIdr(b.amount)}`).join(', ')}`}
        className="flex h-4 overflow-hidden rounded-md"
      >
        {buckets.map((b, i) => (
          <div key={b.bucket} style={{ width: `${(b.amount / total) * 100}%`, backgroundColor: AGING_COLORS[i] }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {buckets.map((b, i) => (
          <li key={b.bucket} className="flex items-center gap-1.5 text-caption text-neutral-600">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: AGING_COLORS[i] }} aria-hidden="true" />
            <span>{b.bucket}</span>
            <span className="font-mono tabular-nums text-neutral-500">{formatIdr(b.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
