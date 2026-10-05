import * as React from 'react';
import { cn } from '../lib/cn';

export type SignalSeverity = 'high' | 'medium' | 'low';

export interface SignalChipProps extends React.HTMLAttributes<HTMLDivElement> {
  severity: SignalSeverity;
  count: number;
  label: string;
  context?: string;
}

const DOT_CLASS: Record<SignalSeverity, string> = {
  high: 'bg-destructive-500',
  medium: 'bg-warning-500',
  low: 'bg-info-500',
};

export function SignalChip({ severity, count, label, context, className, ...props }: SignalChipProps) {
  return (
    <div
      className={cn('flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2', className)}
      {...props}
    >
      <span data-slot="signal-dot" aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', DOT_CLASS[severity])} />
      <span className="font-mono text-h3 tabular-nums text-neutral-950">{count}</span>
      <span className="text-body-sm text-neutral-700">{label}</span>
      {context && <span className="text-caption text-neutral-500">{context}</span>}
    </div>
  );
}
