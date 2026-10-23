import { useState } from 'react';
import { Button, ConfirmActionButton } from '@aec/ui';
import type { BudgetBaselineSummary } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';
import { useFreezeBaseline, useOpenRevision } from '@/features/project';

/**
 * Band dokumen — identitas proyek dan status baseline, selebar halaman.
 *
 * Bukan kartu: hanya dua baris teks, satu garis 2px di bawah, dan aksi di kanan.
 * Tugasnya menjawab "dokumen apa ini, versi berapa, dan apa yang bisa saya
 * lakukan" sebelum pembaca masuk ke angka.
 */
export interface DocumentBandProps {
  projectId: string;
  projectCode: string;
  projectName: string;
  baseline: BudgetBaselineSummary | null;
  /** Versi tepat sebelum baseline aktif, untuk menunjukkan drift. */
  previous: BudgetBaselineSummary | null;
  hasOpenRevision: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'not frozen';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function DocumentBand({
  projectId,
  projectCode,
  projectName,
  baseline,
  previous,
  hasOpenRevision,
}: DocumentBandProps) {
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

  const drift = baseline && previous ? baseline.total - previous.total : null;

  return (
    <header className="border-b-2 border-neutral-300 pb-3">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <p className="font-mono text-caption text-neutral-500">{projectCode}</p>
          <h1 className="mt-0.5 truncate text-h2 text-neutral-950">{projectName}</h1>

          {baseline ? (
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-caption text-neutral-600">
              <span className="font-mono tabular-nums text-neutral-900">v{baseline.version}</span>
              <span className="uppercase">{baseline.status === 'FROZEN' ? 'frozen' : 'draft'}</span>
              <span className="text-neutral-300">·</span>
              <span>{formatDate(baseline.frozenAt)}</span>
              {baseline.label && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span>{baseline.label}</span>
                </>
              )}
              {drift != null && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span
                    className={`font-mono tabular-nums ${drift < 0 ? 'text-destructive-700' : 'text-neutral-700'}`}
                    title={`vs v${previous!.version}`}
                  >
                    {drift > 0 ? '+' : drift < 0 ? '−' : ''}
                    {formatIdrCompact(Math.abs(drift))} vs v{previous!.version}
                  </span>
                </>
              )}
              {hasOpenRevision && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span className="text-warning-800">revision open</span>
                </>
              )}
            </p>
          ) : (
            <p className="mt-1 text-caption text-neutral-600">
              No baseline frozen yet — freeze the current budget to start tracking variance.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {baseline && !hasOpenRevision && (
            <div className="flex items-end gap-2">
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
            </div>
          )}

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
        </div>
      </div>

      {reasonError && <p className="mt-1 text-caption text-destructive-700">{reasonError}</p>}
      {freeze.isError && <p className="mt-1 text-caption text-destructive-700">Failed to freeze. Check the budget data.</p>}
      {revision.isError && <p className="mt-1 text-caption text-destructive-700">Failed to open a revision.</p>}
    </header>
  );
}
