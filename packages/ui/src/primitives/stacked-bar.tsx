import { cn } from '../lib/cn';

export type StackedBarTone = 'neutral-dark' | 'neutral-mid' | 'neutral-light' | 'destructive' | 'success' | 'warning';

export interface StackedSegment {
  /** Nilai segmen (>= 0). Segmen bernilai 0 tidak digambar. */
  value: number;
  tone: StackedBarTone;
  label: string;
}

export interface StackedBarProps {
  segments: StackedSegment[];
  /** Format angka untuk aria-label. */
  format?: (n: number) => string;
  className?: string;
}

const TONE: Record<StackedBarTone, string> = {
  'neutral-dark': 'bg-neutral-800',
  'neutral-mid': 'bg-neutral-400',
  'neutral-light': 'bg-neutral-200',
  destructive: 'bg-destructive-600',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
};

/**
 * Bar bertumpuk proporsional (mis. committed │ this request │ remaining).
 *
 * Setiap segmen punya `aria-label` berisi SELURUH nilai, bukan hanya warna —
 * karena warna bukan satu-satunya cara memahami data (WCAG 1.4.1). Total 0 →
 * bar kosong netral, tanpa pembagian nol.
 */
export function StackedBar({ segments, format = String, className }: StackedBarProps) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const label = segments.map((s) => `${s.label} ${format(Math.max(0, s.value))}`).join(', ');

  return (
    <div role="img" aria-label={label} className={cn('flex h-3 w-full overflow-hidden rounded-full bg-neutral-100', className)}>
      {total > 0 &&
        segments.map((s, i) =>
          s.value > 0 ? (
            <div
              key={`${s.label}-${i}`}
              data-slot="stacked-segment"
              data-label={s.label}
              className={cn('h-full', TONE[s.tone])}
              style={{ width: `${(s.value / total) * 100}%` }}
            />
          ) : null,
        )}
    </div>
  );
}
