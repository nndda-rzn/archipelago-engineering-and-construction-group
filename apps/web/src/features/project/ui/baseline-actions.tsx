import { useState } from 'react';
import { Button, ConfirmActionButton } from '@aec/ui';
import type { BudgetBaselineSummary } from '@aec/api-contracts';
import { useFreezeBaseline, useOpenRevision } from '@/features/project';

/**
 * Aksi baseline untuk band dokumen.
 *
 * Aturannya mengikuti keadaan data, bukan selera:
 * - ada baseline & tidak ada revisi terbuka -> boleh buka revisi atau freeze ulang
 * - revisi terbuka -> hanya freeze (revisi kedua ditolak API)
 * - belum ada baseline -> freeze adalah satu-satunya jalan
 */
export interface BaselineActionsProps {
  projectId: string;
  baseline: BudgetBaselineSummary | null;
  hasOpenRevision: boolean;
  /** Sembunyikan freeze bila memang belum ada budget untuk dibekukan. */
  canFreeze: boolean;
}

export function BaselineActions({ projectId, baseline, hasOpenRevision, canFreeze }: BaselineActionsProps) {
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

  if (!canFreeze && !baseline) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-end gap-2">
        {baseline && !hasOpenRevision && (
          <>
            <label className="flex flex-col text-caption text-neutral-600" htmlFor="revision-reason">
              Reason
              <input
                id="revision-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. VO-01 steel"
                className="mt-1 h-8 w-52 rounded-md border border-neutral-300 bg-white px-2 text-body-sm text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-800"
              />
            </label>
            <Button size="sm" variant="secondary" disabled={revision.isPending} onClick={submitRevision}>
              {revision.isPending ? 'Opening…' : 'Open revision'}
            </Button>
          </>
        )}

        {canFreeze && (
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
        )}
      </div>

      {reasonError && <p className="text-caption text-destructive-700">{reasonError}</p>}
      {freeze.isError && <p className="text-caption text-destructive-700">Failed to freeze. Check the budget data.</p>}
      {revision.isError && <p className="text-caption text-destructive-700">Failed to open a revision.</p>}
    </div>
  );
}
