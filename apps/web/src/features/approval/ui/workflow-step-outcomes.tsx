import { StackedBar, cn } from '@aec/ui';
import type { WorkflowInsights } from '@aec/api-contracts';

export interface WorkflowStepOutcomesProps {
  byStep: WorkflowInsights['byStep'];
  className?: string;
}

/**
 * Hasil per langkah sebagai **satu bar bertumpuk per langkah**.
 *
 * Menggantikan funnel. Funnel benar hanya bila nilainya turun monoton dan
 * penurunannya berarti kehilangan. Di rantai approval, jumlah task di langkah
 * berikutnya lebih sedikit karena **syarat langkah itu tidak terpenuhi** — dokumen
 * memang tidak perlu melewatinya. Funnel membacanya sebagai "dokumen gugur", dan
 * itu salah: pada data nyata, 11 dokumen di langkah 1 dan 6 di langkah 2 berarti
 * 5 dokumen selesai lebih awal, bukan 5 dokumen gagal.
 *
 * Bentuk yang benar untuk "berapa sampai langkah ini, dan apa hasilnya" adalah
 * perbandingan kategori → **bar bertumpuk**. Ia juga menyatukan dua blok lama
 * yang menampilkan data sama dua kali ("Documents by step" + "Outcome by step"),
 * jadi jumlah blok berkurang, bukan bertambah.
 *
 * Warna tidak pernah sendiri: setiap bar punya nama aksesibel dengan angka
 * lengkap, dan ada legenda bertulis.
 */
export function WorkflowStepOutcomes({ byStep, className }: WorkflowStepOutcomesProps) {
  if (byStep.length === 0) return null;

  return (
    <div className={className}>
      <ul className="space-y-2.5">
        {byStep.map((s) => (
          <li
            key={s.stepOrder}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3"
            aria-label={
              `Step ${s.stepOrder}: ${s.total} task${s.total === 1 ? '' : 's'} — ` +
              `${s.approved} approved, ${s.rejected} rejected, ${s.pending} pending, ${s.cancelled} cancelled`
            }
          >
            <span className="flex min-w-0 flex-col">
              <span className="whitespace-nowrap font-mono text-caption tabular-nums text-neutral-600">
                Step {s.stepOrder}
              </span>
              <span className="min-w-0 max-w-[11rem] truncate text-caption text-neutral-500" title={s.stepName}>
                {s.stepName}
              </span>
            </span>

            <StackedBar
              segments={[
                { value: s.approved, tone: 'success', label: 'approved' },
                { value: s.rejected, tone: 'destructive', label: 'rejected' },
                { value: s.pending, tone: 'warning', label: 'pending' },
                { value: s.cancelled, tone: 'neutral-light', label: 'cancelled' },
              ]}
              format={String}
            />

            <span className="shrink-0 whitespace-nowrap font-mono text-body-sm tabular-nums text-neutral-800">
              {s.total}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-neutral-500">
        <Legend className="bg-success-500">Approved</Legend>
        <Legend className="bg-destructive-600">Rejected</Legend>
        <Legend className="bg-warning-500">Pending</Legend>
        <Legend className="bg-neutral-200">Cancelled</Legend>
      </div>

      {/* Batas kejujuran: tanpa kalimat ini, angka yang turun antar langkah
          terbaca sebagai kehilangan dokumen. */}
      <p className="mt-2 text-pretty text-caption text-neutral-500">
        Each document gets one task per step it passes, and not every document needs every step — a step is
        skipped when its rule does not match. A smaller bar further along therefore means fewer documents
        were routed there, not that documents were lost.
      </p>
    </div>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-sm', className)} aria-hidden="true" />
      {children}
    </span>
  );
}
