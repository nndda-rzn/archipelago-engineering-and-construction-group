import * as React from 'react';
import { cn } from '../lib/cn';

export interface MiniStatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  /** Konteks singkat di bawah nilai (mis. "target ≤ 45 d"). */
  context?: string;
  /** Warna nilai bila perlu menandai kondisi. */
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
}

const TONE: Record<NonNullable<MiniStatProps['tone']>, string> = {
  neutral: 'text-neutral-950',
  positive: 'text-success-700',
  negative: 'text-destructive-700',
  warning: 'text-warning-700',
};

/** Metrik ringkas tanpa kartu: label kecil + angka + konteks. Untuk grid padat. */
export function MiniStat({ label, value, context, tone = 'neutral', className, ...props }: MiniStatProps) {
  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <span className="text-overline uppercase text-neutral-500">{label}</span>
      <span className={cn('mt-0.5 font-mono tabular-nums text-metric-sm', TONE[tone])}>{value}</span>
      {context && <span className="text-caption text-neutral-500">{context}</span>}
    </div>
  );
}
