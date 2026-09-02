import * as React from 'react';
import { cn } from '../lib/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {

  asChild?: boolean;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-neutral-100',
        className,
      )}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-4" aria-label="Memuat data">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-neutral-100 py-2.5 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-4', c === 0 ? 'w-28' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-7 w-36" />
        </div>
      ))}
    </div>
  );
}
