import { BulletBar, StackedBar, cn } from '@aec/ui';
import type { WorkflowInsights } from '@aec/api-contracts';
import { formatNumber } from '@/shared/lib/format';
import { opLabel } from './workflow-labels';

/**
 * Insight operasional. Setiap blok **hanya tampil bila datanya bermakna** — satu
 * titik data ditampilkan sebagai angka, bukan dipaksa jadi grafik. Bentuk dipilih
 * menurut pertanyaannya: peringkat → bar horizontal, bagian-dari-keseluruhan →
 * bar bertumpuk, deret waktu → bar+garis, sebaran vs ambang → histogram + garis.
 */
export function WorkflowInsightsPanel({ data }: { data: WorkflowInsights }) {
  const hasTasks = data.byStep.length > 0;
  const maxStepTotal = Math.max(...data.byStep.map((s) => s.total), 0);
  const hasMonths = data.monthly.length >= 2;
  const maxMonth = Math.max(...data.monthly.map((m) => Math.max(m.created, m.decided)), 0);
  const maxBucket = Math.max(...data.amounts.buckets.map((b) => b.count), 0);
  const maxDocument = data.amounts.max ?? 0;

  return (
    <div className="space-y-6">
      {!hasTasks && (
        <p className="text-body-sm text-neutral-500">
          No approval tasks recorded for {data.transactionType} yet, so there is nothing to summarise.
        </p>
      )}

      {hasTasks && (
        <>
          {/* Peringkat: di langkah mana dokumen menumpuk. */}
          <section aria-labelledby="wf-insight-steps">
            <h4 id="wf-insight-steps" className="mb-2 text-body-sm font-medium text-neutral-800">Documents by step</h4>
            <ul className="space-y-2">
              {data.byStep.map((s) => (
                <li key={s.stepOrder} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <span className="w-14 shrink-0 font-mono text-caption tabular-nums text-neutral-600">Step {s.stepOrder}</span>
                  <BulletBar
                    value={s.total}
                    max={maxStepTotal}
                    tone="neutral"
                    label={`Step ${s.stepOrder} ${s.stepName}: ${s.total} documents`}
                  />
                  <span className="w-28 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-700">
                    {s.total} doc{s.total === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Bagian-dari-keseluruhan per langkah: approved / rejected / pending. */}
          <section aria-labelledby="wf-insight-outcome">
            <h4 id="wf-insight-outcome" className="mb-2 text-body-sm font-medium text-neutral-800">Outcome by step</h4>
            <ul className="space-y-2">
              {data.byStep.map((s) => (
                <li key={s.stepOrder} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                  <span className="w-14 shrink-0 font-mono text-caption tabular-nums text-neutral-600">Step {s.stepOrder}</span>
                  <StackedBar
                    segments={[
                      { value: s.approved, tone: 'success', label: 'approved' },
                      { value: s.rejected, tone: 'destructive', label: 'rejected' },
                      { value: s.pending, tone: 'warning', label: 'pending' },
                      { value: s.cancelled, tone: 'neutral-light', label: 'cancelled' },
                    ]}
                    format={String}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-neutral-500">
              <Legend className="bg-success-500">Approved</Legend>
              <Legend className="bg-destructive-600">Rejected</Legend>
              <Legend className="bg-warning-500">Pending</Legend>
              <Legend className="bg-neutral-200">Cancelled</Legend>
            </p>
          </section>
        </>
      )}

      {/* Deret waktu — hanya bila ada lebih dari satu bulan. */}
      {hasMonths && (
        <section aria-labelledby="wf-insight-monthly">
          <h4 id="wf-insight-monthly" className="mb-2 text-body-sm font-medium text-neutral-800">Monthly volume</h4>
          <ul className="space-y-2">
            {data.monthly.map((m) => (
              <li key={m.month} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className="w-16 shrink-0 font-mono text-caption tabular-nums text-neutral-600">{m.month}</span>
                <span
                  className="flex h-4 w-full items-end gap-1"
                  role="img"
                  aria-label={`${m.month}: ${m.created} submitted, ${m.decided} decided`}
                >
                  <span
                    data-slot="month-created"
                    className="h-full rounded-sm bg-neutral-400"
                    style={{ width: `${maxMonth > 0 ? (m.created / maxMonth) * 50 : 0}%` }}
                  />
                  <span
                    data-slot="month-decided"
                    className="h-full rounded-sm bg-neutral-800"
                    style={{ width: `${maxMonth > 0 ? (m.decided / maxMonth) * 50 : 0}%` }}
                  />
                </span>
                <span className="w-32 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-700">
                  {m.created} in · {m.decided} out
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sebaran nominal + ambang tiap langkah. */}
      {data.amounts.count > 0 && (
        <section aria-labelledby="wf-insight-amounts">
          <h4 id="wf-insight-amounts" className="mb-2 text-body-sm font-medium text-neutral-800">Document value distribution</h4>
          <ul className="flex flex-wrap items-end gap-3">
            {data.amounts.buckets.map((b) => (
              <li key={b.label} className="flex w-20 flex-col items-center gap-1">
                <span className="font-mono text-caption tabular-nums text-neutral-700">{b.count}</span>
                <span
                  role="img"
                  aria-label={`${b.label}: ${b.count} document${b.count === 1 ? '' : 's'}`}
                  className={cn('w-full rounded-sm', b.count > 0 ? 'bg-neutral-800' : 'bg-neutral-100')}
                  style={{ height: `${maxBucket > 0 ? Math.max(4, (b.count / maxBucket) * 64) : 4}px` }}
                />
                <span className="text-center text-caption text-neutral-500">{b.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-neutral-500">
            {data.amounts.count} document{data.amounts.count === 1 ? '' : 's'} · smallest{' '}
            <span className="font-mono tabular-nums">{formatNumber(data.amounts.min ?? 0)}</span> · largest{' '}
            <span className="font-mono tabular-nums">{formatNumber(maxDocument)}</span>
          </p>
        </section>
      )}

      {/* Berapa dokumen yang benar-benar kena syarat tiap langkah. */}
      {data.ruleHits.length > 0 && (
        <section aria-labelledby="wf-insight-rules">
          <h4 id="wf-insight-rules" className="mb-2 text-body-sm font-medium text-neutral-800">Rule impact</h4>
          <ul className="space-y-2">
            {data.ruleHits.map((r) => (
              <li key={r.stepOrder} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className="w-14 shrink-0 font-mono text-caption tabular-nums text-neutral-600">Step {r.stepOrder}</span>
                <span className="min-w-0 truncate text-caption text-neutral-600">
                  {r.condition ? r.condition : 'Always applies'}
                </span>
                <span className="w-40 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-700">
                  {r.matching} of {data.amounts.count} match
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cakupan role — 0 pemegang berarti rantai macet. */}
      {data.coverage.length > 0 && (
        <section aria-labelledby="wf-insight-coverage">
          <h4 id="wf-insight-coverage" className="mb-2 text-body-sm font-medium text-neutral-800">Approver coverage</h4>
          <ul className="space-y-1.5">
            {data.coverage.map((c) => (
              <li key={`${c.stepOrder}-${c.roleCode}`} className="flex items-center gap-3 text-body-sm">
                <span className="w-14 shrink-0 font-mono text-caption tabular-nums text-neutral-600">Step {c.stepOrder}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-caption text-neutral-700">{c.roleCode}</span>
                <span className={cn('shrink-0 font-mono text-caption tabular-nums', c.holders === 0 ? 'text-destructive-700' : 'text-neutral-700')}>
                  {c.holders === 0 ? 'no holder — chain will stall' : `${c.holders} holder${c.holders === 1 ? '' : 's'}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Batas kejujuran: task tidak menyimpan versi definisi yang dipakai. */}
      <p className="border-t border-neutral-200 pt-3 text-caption text-neutral-500">{data.note}</p>
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

/** Ringkas ambang syarat untuk judul blok simulasi. */
export function ruleSummary(condition: string | null, field: string | null, op: string | null, value: number | null): string {
  if (!condition) return 'Always applies';
  return `${field ?? ''} ${opLabel(op)} ${formatNumber(value ?? 0)}`;
}
