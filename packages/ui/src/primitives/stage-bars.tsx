import * as React from 'react';
import { cn } from '../lib/cn';

export interface StageDatum {
  stage: string;
  count: number;
  value: number;
}

export interface StageBarsProps extends React.HTMLAttributes<HTMLUListElement> {
  /** Tahap funnel, sudah dalam urutan tampil (mis. LEAD → WON). */
  stages: StageDatum[];
  /** Format nilai untuk label; default `String`. */
  format?: (n: number) => string;
}

/**
 * Bar horizontal per tahap funnel. Panjang bar = value relatif terhadap tahap
 * terbesar; tahap bernilai 0 tetap dirender dengan label (bentuk stabil).
 * Setiap bar `role="img"` + aria-label berisi count dan value — warna bukan
 * satu-satunya sinyal.
 */
export function StageBars({ stages, format = String, className, ...props }: StageBarsProps) {
  const max = Math.max(1, ...stages.map((s) => s.value));

  return (
    <ul className={cn('space-y-1.5', className)} {...props}>
      {stages.map((s, i) => {
        const pct = max > 0 ? Math.min(100, Math.max(0, (s.value / max) * 100)) : 0;
        return (
          <li key={`${s.stage}-${i}`} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2.5">
            <span className="truncate text-caption text-neutral-500" title={s.stage}>
              {s.stage}
            </span>
            <span
              role="img"
              aria-label={`${s.stage}: ${s.count} · ${format(s.value)}`}
              className="h-2.5 w-full overflow-hidden rounded-sm bg-neutral-100"
            >
              <span data-slot="stage-fill" className="block h-full rounded-sm bg-neutral-800" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-right font-mono text-caption tabular-nums text-neutral-600">{format(s.value)}</span>
          </li>
        );
      })}
    </ul>
  );
}
