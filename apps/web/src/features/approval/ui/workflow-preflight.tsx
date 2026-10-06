import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button, cn } from '@aec/ui';
import { hasBlockers, type PreflightIssue } from '../lib/preflight';

export interface WorkflowPreflightProps {
  issues: PreflightIssue[];
  /** Melompat ke langkah bermasalah di kanvas/inspector. */
  onSelectStep?: (stepId: string) => void;
  className?: string;
}

/**
 * Daftar masalah sebelum publish.
 *
 * Ditampilkan di dalam dialog Publish agar pengguna melihat **apa yang kurang**
 * di tempat keputusan itu diambil, bukan setelah gagal. Tiap masalah yang punya
 * langkah bisa diklik untuk melompat ke node-nya — memperpendek jarak antara
 * pesan dan perbaikannya.
 */
export function WorkflowPreflight({ issues, onSelectStep, className }: WorkflowPreflightProps) {
  if (issues.length === 0) {
    return (
      <div className={cn('flex items-start gap-2 rounded-md border border-success-200 bg-success-50 p-3', className)}>
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />
        <div>
          <p className="text-body-sm font-medium text-neutral-800">Ready to publish</p>
          <p className="mt-0.5 text-caption text-neutral-600">
            Every step has an approver and its rules are complete.
          </p>
        </div>
      </div>
    );
  }

  const blocked = hasBlockers(issues);

  return (
    <div className={cn('space-y-2', className)} role="list" aria-label="Publish checks">
      <p className={cn('text-body-sm', blocked ? 'text-destructive-700' : 'text-neutral-700')}>
        {blocked
          ? 'Fix these before publishing:'
          : 'You can publish, but review these first:'}
      </p>
      {issues.map((issue) => (
        <div
          key={`${issue.code}-${issue.stepId ?? 'none'}-${issue.stepOrder ?? 0}`}
          role="listitem"
          className={cn(
            'flex items-start gap-2 rounded-md border p-2.5',
            issue.severity === 'blocker' ? 'border-destructive-200 bg-destructive-50' : 'border-warning-200 bg-warning-50',
          )}
        >
          <AlertTriangle
            className={cn('mt-0.5 h-4 w-4 shrink-0', issue.severity === 'blocker' ? 'text-destructive-600' : 'text-warning-600')}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-pretty text-body-sm text-neutral-800">{issue.message}</p>
            {issue.stepId && onSelectStep && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 h-auto px-0 py-0 text-caption"
                onClick={() => onSelectStep(issue.stepId!)}
              >
                Go to step {issue.stepOrder}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
