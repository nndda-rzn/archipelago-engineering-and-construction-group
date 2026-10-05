import { cn } from '../lib/cn';

export type DeltaDirection = 'up' | 'down' | 'flat';

export interface DeltaBadgeProps {
  pct: number | null;
  direction: DeltaDirection;
  className?: string;
}

const ARROW: Record<DeltaDirection, string> = { up: '\u2191', down: '\u2193', flat: '\u2192' };
const COLOR: Record<DeltaDirection, string> = {
  up: 'text-financial-positive-600',
  down: 'text-financial-negative-600',
  flat: 'text-neutral-500',
};

export function DeltaBadge({ pct, direction, className }: DeltaBadgeProps) {
  if (pct == null) {
    return <span className={cn('text-caption text-neutral-400', className)}>—</span>;
  }
  const label = `${pct >= 0 ? '+' : ''}${Math.round(pct * 10) / 10}%`;
  return (
    <span
      aria-label={direction}
      className={cn('inline-flex items-center gap-0.5 font-mono text-caption tabular-nums', COLOR[direction], className)}
    >
      <span aria-hidden="true">{ARROW[direction]}</span>
      {label}
    </span>
  );
}
