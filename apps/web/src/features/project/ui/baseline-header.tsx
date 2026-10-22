import { useState } from 'react';
import { Button, ConfirmActionButton } from '@aec/ui';
import type { BudgetBaselineSummary } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';
import { useFreezeBaseline, useOpenRevision } from '@/features/project';

/**
 * Header baseline: versi yang sedang berlaku, kapan dibekukan, dan aksi yang
 * tersedia.
 *
 * Aturan tombol mengikuti keadaan data, bukan selera:
 * - belum ada baseline  -> Freeze adalah aksi utama (satu-satunya jalan).
 * - ada baseline, tanpa revisi terbuka -> boleh Open revision atau Freeze ulang.
 * - revisi terbuka      -> hanya Freeze; membuka revisi kedua ditolak API.
 */
export interface BaselineHeaderProps {
  projectId: string;
  baseline: BudgetBaselineSummary | null;
  /** Versi FROZEN sebelumnya, untuk menunjukkan berapa total bergeser. */
  previous?: BudgetBaselineSummary | null;
  hasOpenRevision: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function BaselineHeader({ projectId, baseline, previous, hasOpenRevision }: BaselineHeaderProps) {
  const freeze = useFreezeBaseline(projectId);
  const revision = useOpenRevision(projectId);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const submitRevision = () => {
    // API menolak alasan < 3 karakter; UI tidak boleh membiarkan pengguna
    // menabrak error itu setelah menekan tombol.
    if (reason.trim().length < 3) {
      setReasonError('A reason of at least 3 characters is required.');
      return;
    }
    setReasonError(null);
    revision.mutate({ reason: reason.trim() });
    setReason('');
  };

  return (
    <section aria-label="Budget baseline" className="border-b border-neutral-200 pb-3">
      {baseline ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-body-sm text-neutral-900">
            <span className="font-mono tabular-nums">v{baseline.version}</span>
            <span className="ml-2 text-neutral-600">{baseline.status === 'FROZEN' ? 'frozen' : 'draft'}</span>
            <span className="mx-2 text-neutral-300">·</span>
            <span className="text-neutral-600">{formatDate(baseline.frozenAt)}</span>
            {baseline.label && (
              <>
                <span className="mx-2 text-neutral-300">·</span>
                <span className="text-neutral-600">{baseline.label}</span>
              </>
            )}
            <span className="mx-2 text-neutral-300">·</span>
            <span className="font-mono tabular-nums text-neutral-800" title="Frozen total">
              {formatIdrCompact(baseline.total)}
            </span>
            {previous && (
              <>
                <span className="mx-2 text-neutral-300">·</span>
                <span
                  className={`font-mono tabular-nums ${baseline.total - previous.total < 0 ? 'text-destructive-700' : 'text-neutral-700'}`}
                  title={`vs v${previous.version}: ${formatIdrCompact(baseline.total - previous.total)}`}
                >
                  {baseline.total - previous.total > 0 ? '+' : baseline.total - previous.total < 0 ? '−' : ''}
                  {formatIdrCompact(Math.abs(baseline.total - previous.total))} vs v{previous.version}
                </span>
              </>
            )}
          </p>
          {hasOpenRevision && <p className="text-caption text-warning-800">Revision open</p>}
        </div>
      ) : (
        <p className="text-body-sm text-neutral-600">
          No baseline frozen yet. Freeze the current budget to start tracking variance.
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ConfirmActionButton
          size="sm"
          confirmTitle="Freeze baseline"
          confirmDescription={
            baseline
              ? `Freeze the current budget as v${baseline.version + 1}. This cannot be edited afterwards.`
              : 'Freeze the current budget as v1. This cannot be edited afterwards.'
          }
          confirmLabel="Freeze"
          onConfirm={() => freeze.mutate({})}
          loading={freeze.isPending}
        >
          Freeze baseline
        </ConfirmActionButton>

        {baseline && !hasOpenRevision && (
          <div className="flex items-end gap-2">
            <label className="flex flex-col text-caption text-neutral-600" htmlFor="revision-reason">
              Reason
              <input
                id="revision-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. VO-01 steel"
                className="mt-1 h-8 w-56 rounded-md border border-neutral-300 bg-white px-2 text-body-sm text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-800"
              />
            </label>
            <Button size="sm" variant="secondary" disabled={revision.isPending} onClick={submitRevision}>
              {revision.isPending ? 'Opening…' : 'Open revision'}
            </Button>
          </div>
        )}
      </div>

      {reasonError && <p className="mt-1 text-caption text-destructive-700">{reasonError}</p>}
      {freeze.isError && <p className="mt-1 text-caption text-destructive-700">Failed to freeze. Check the budget data.</p>}
      {revision.isError && <p className="mt-1 text-caption text-destructive-700">Failed to open a revision.</p>}
    </section>
  );
}
