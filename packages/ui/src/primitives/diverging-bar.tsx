import * as React from 'react';
import { cn } from '../lib/cn';

export interface DivergingBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Besaran ke arah kiri dari titik nol (mis. Payable). */
  left: number;
  /** Besaran ke arah kanan dari titik nol (mis. Receivable). */
  right: number;
  leftLabel: string;
  rightLabel: string;
  /** Format angka untuk aria-label; default `String`. */
  format?: (n: number) => string;
}

/**
 * Bar diverging dua arah dari titik nol — untuk nilai bertanda (mis. AP ◀ 0 ▶ AR).
 * Kedua sisi diskalakan terhadap besaran terbesar agar panjangnya sebanding.
 * Aksesibel lewat `role="img"` + aria-label berisi kedua nilai.
 */
export function DivergingBar({
  left,
  right,
  leftLabel,
  rightLabel,
  format = String,
  className,
  ...props
}: DivergingBarProps) {
  const max = Math.max(left, right, 1);
  const leftPct = left > 0 ? (left / max) * 100 : 0;
  const rightPct = right > 0 ? (right / max) * 100 : 0;

  return (
    <div
      role="img"
      aria-label={`${leftLabel} ${format(left)}, ${rightLabel} ${format(right)}`}
      className={cn('flex h-3 w-full items-stretch', className)}
      {...props}
    >
      <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-neutral-100">
        <div data-slot="diverging-fill" className="h-full bg-warning-500" style={{ width: `${leftPct}%` }} />
      </div>
      <span data-slot="diverging-zero" aria-hidden="true" className="w-px shrink-0 bg-neutral-400" />
      <div className="flex flex-1 justify-start overflow-hidden rounded-r-full bg-neutral-100">
        <div data-slot="diverging-fill" className="h-full bg-success-500" style={{ width: `${rightPct}%` }} />
      </div>
    </div>
  );
}
