import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * EmptyCell — placeholder nilai kosong di tabel.
 * Em dash di-dim (text-neutral-300) + aria-label untuk screen reader (NFR-A11Y-001).
 */
export interface EmptyCellProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Label aksesibilitas. Default 'Tidak ada'. */
  label?: string;
}

export function EmptyCell({ className, label = 'Tidak ada', ...props }: EmptyCellProps) {
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
