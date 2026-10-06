import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StackedBar, type StackedSegment } from '@aec/ui';
import type { ApprovalDetail } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';

/**
 * Dampak anggaran — jawaban atas pertanyaan utama approver: "muat atau tidak?".
 *
 * Angka berasal dari `computeBudgetCheck` yang SAMA dengan validasi pembuatan PR
 * (FR-PRO-002), jadi tidak ada dua perhitungan yang bisa berbeda. `this request`
 * hanyalah nominal dokumen ini; committed/remaining sudah mencakupnya bila dokumen
 * sudah RELEASED — karena itu segmennya dilabeli apa adanya, bukan diklaim.
 */
export function BudgetImpact({ budget, amount }: { budget: NonNullable<ApprovalDetail['budget']>; amount: number | null }) {
  const request = amount ?? 0;
  const remainingAfter = budget.remaining - request;
  const within = remainingAfter >= -0.001;

  const segments: StackedSegment[] = [
    { value: budget.commitment, tone: 'neutral-mid', label: 'Committed' },
    { value: request, tone: within ? 'neutral-dark' : 'destructive', label: 'This request' },
    { value: Math.max(0, budget.remaining), tone: 'neutral-light', label: 'Remaining' },
  ];

  return (
    <section className="border-b border-neutral-200 px-6 py-4" aria-label="Budget impact">
      <h3 className="mb-2 text-h3 text-neutral-800">Budget impact</h3>

      <StackedBar segments={segments} format={formatIdr} className="h-3" />

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-neutral-500">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-neutral-400" />Committed {formatIdr(budget.commitment)}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${within ? 'bg-neutral-800' : 'bg-destructive-600'}`} />This request {formatIdr(request)}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-neutral-200" />Remaining {formatIdr(budget.remaining)}</span>
      </div>

      <p className={`mt-2 inline-flex items-center gap-1.5 text-body-sm ${within ? 'text-neutral-700' : 'text-destructive-600'}`}>
        {within ? <CheckCircle2 className="h-4 w-4 text-success-500" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4 text-destructive-500" aria-hidden="true" />}
        {within ? (
          <>Within budget · remaining after approval {formatIdr(remainingAfter)}</>
        ) : (
          <>Exceeds remaining budget by {formatIdr(Math.abs(remainingAfter))}</>
        )}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-caption sm:grid-cols-4">
        <div><dt className="text-neutral-500">Baseline</dt><dd className="font-mono tabular-nums text-neutral-800">{formatIdr(budget.budget)}</dd></div>
        <div><dt className="text-neutral-500">Committed</dt><dd className="font-mono tabular-nums text-neutral-800">{formatIdr(budget.commitment)}</dd></div>
        <div><dt className="text-neutral-500">Open PRs</dt><dd className="font-mono tabular-nums text-neutral-800">{formatIdr(budget.existingPr)}</dd></div>
        <div><dt className="text-neutral-500">Remaining</dt><dd className={`font-mono tabular-nums ${budget.remaining >= 0 ? 'text-neutral-800' : 'text-destructive-600'}`}>{formatIdr(budget.remaining)}</dd></div>
      </dl>
      <p className="mt-2 text-caption text-neutral-400">FR-PRO-002 · same calculation used when a PR is created.</p>
    </section>
  );
}
