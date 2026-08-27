import { Badge, ConfirmActionButton } from '@aec/ui';
import { CheckCircle2, Lock } from 'lucide-react';
import { formatIdrCustom } from '@/shared/lib/format';

export function BudgetStatusBadge({ published, publishPending, onPublish }: { published: boolean; publishPending: boolean; onPublish: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <Badge variant={published ? 'success' : 'default'}>
        {published ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <Lock className="h-3 w-3" aria-hidden="true" />}
        {published ? 'PUBLISHED' : 'DRAFT'}
      </Badge>
      {!published && (
        <ConfirmActionButton
          size="sm"
          confirmTitle="Publish baseline"
          confirmDescription="Setelah publish tidak bisa diedit."
          confirmLabel="Publish"
          onConfirm={onPublish}
          loading={publishPending}
        >
          Publish Baseline
        </ConfirmActionButton>
      )}
    </div>
  );
}

export function BudgetTotalBar({ total, currency }: { total: number; currency: string }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2">
      <span className="text-caption font-medium uppercase text-neutral-500">WBS</span>
      <span className="text-caption font-medium uppercase text-neutral-500">
        Total: <span className="font-mono tabular-nums text-neutral-900">{formatIdrCustom(total, currency)}</span>
      </span>
    </div>
  );
}
