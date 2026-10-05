import { cn } from '../lib/cn';

export interface BulletBarProps {
  value: number;
  max: number;
  label: string;
  className?: string;
}

export function BulletBar({ value, max, label, className }: BulletBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div
      role="img"
      aria-label={`${label}: ${pct}%`}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-neutral-100', className)}
    >
      <div className="h-full rounded-full bg-racing-red-600" style={{ width: `${pct}%` }} />
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
