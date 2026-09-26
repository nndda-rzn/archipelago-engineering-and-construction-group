import * as React from 'react';
import { Inbox, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button, type ButtonProps } from '../primitives/button';
import { Skeleton } from '../primitives/skeleton';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100">
        <Inbox className="h-5 w-5 text-neutral-400" aria-hidden="true" />
      </div>
      <div>
        <p className="text-body font-medium text-neutral-700">{title ?? 'No data yet'}</p>
        {description && <p className="mt-0.5 text-body-sm text-neutral-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryVariant?: ButtonProps['variant'];
  className?: string;
}

export function ErrorState({ message, onRetry, retryLabel = 'Try again', retryVariant = 'secondary', className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive-50">
        <AlertTriangle className="h-5 w-5 text-destructive-500" aria-hidden="true" />
      </div>
      <div>
        <p className="text-body font-medium text-neutral-700">Failed to load data</p>
        {message && <p className="mt-0.5 text-body-sm text-neutral-500">{message}</p>}
      </div>
      {onRetry && (
        <Button size="sm" variant={retryVariant} onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export function GridState({ loading, error, empty, emptyAction, retry }: {
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  emptyAction?: React.ReactNode;
  retry?: () => void;
}) {
  if (loading) return <TableSkeletonInline />;
  if (error) return <ErrorState onRetry={retry} />;
  if (empty) return <EmptyState description="No matching data." action={emptyAction} />;
  return null;
}

function TableSkeletonInline() {
  return (
    <div className="p-4" aria-label="Loading data">
      {Array.from({ length: 4 }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-neutral-100 py-2.5 last:border-0">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}