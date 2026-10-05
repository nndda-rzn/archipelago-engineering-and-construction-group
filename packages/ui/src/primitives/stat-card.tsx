import * as React from 'react';
import { cn } from '../lib/cn';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  context?: string;
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
}

const DELTA_ARROW: Record<'up' | 'down' | 'flat', string> = {
  up: '\u2191',
  down: '\u2193',
  flat: '\u2192',
};

const DELTA_CLASS: Record<'up' | 'down' | 'flat', string> = {
  up: 'text-financial-positive-600',
  down: 'text-financial-negative-600',
  flat: 'text-neutral-500',
};

export function StatCard({ label, value, context, delta, className, ...props }: StatCardProps) {
  return (
    <div className={cn('rounded-md border border-neutral-200 bg-white p-4 shadow-xs', className)} {...props}>
      <p className="text-overline uppercase text-neutral-500">{label}</p>
      <p className="mt-1 font-mono tabular-nums text-h2 text-neutral-950">{value}</p>
      {context && <p className="mt-1 text-caption text-neutral-500">{context}</p>}
      {delta && (
        <span
          data-slot="stat-delta"
          aria-label={delta.direction}
          className={cn('mt-1 inline-flex items-center gap-1 text-caption', DELTA_CLASS[delta.direction])}
        >
          <span aria-hidden="true">{DELTA_ARROW[delta.direction]}</span>
          {delta.value}
        </span>
      )}
    </div>
  );
}
