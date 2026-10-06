import { cn } from '../lib/cn';

/** Warna isi bar. `brand` = default lama (racing-red) agar pemanggil eksisting tidak berubah. */
export type BarTone = 'brand' | 'neutral' | 'warning' | 'destructive' | 'success';

const TONE_FILL: Record<BarTone, string> = {
  brand: 'bg-racing-red-600',
  neutral: 'bg-neutral-400',
  warning: 'bg-warning-500',
  destructive: 'bg-destructive-600',
  success: 'bg-success-500',
};

export interface BulletBarProps {
  value: number;
  max: number;
  label: string;
  /** Warna isi. Default `brand` (racing-red) untuk kompatibilitas pemakaian lama. */
  tone?: BarTone;
  className?: string;
}

export function BulletBar({ value, max, label, tone = 'brand', className }: BulletBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div
      role="img"
      aria-label={`${label}: ${pct}%`}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-neutral-100', className)}
    >
      <div data-slot="bullet-fill" className={cn('h-full rounded-full', TONE_FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export interface MiniStackedBarProps {
  primary: number;
  secondary: number;
  label: string;
  className?: string;
}

export function MiniStackedBar({ primary, secondary, label, className }: MiniStackedBarProps) {
  const total = primary + secondary;
  const primaryPct = total > 0 ? (primary / total) * 100 : 0;
  return (
    <div
      role="img"
      aria-label={`${label}: ${primary} / ${secondary}`}
      className={cn('flex h-2 w-full overflow-hidden rounded-full bg-neutral-100', className)}
    >
      <div className="h-full bg-racing-red-600" style={{ width: `${primaryPct}%` }} />
      <div className="h-full bg-neutral-300" style={{ width: `${100 - primaryPct}%` }} />
    </div>
  );
}
