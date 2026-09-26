import * as React from 'react';
import { cn } from '../lib/cn';

export interface EmptyCellProps extends React.HTMLAttributes<HTMLSpanElement> {

  label?: string;
}

export function EmptyCell({ className, label = 'None', ...props }: EmptyCellProps) {
  return (
    <span
      aria-label={label}
      className={cn('text-neutral-300', className)}
      {...props}
    >
      —
    </span>
  );
}
