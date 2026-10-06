import { BulletBar, StackedBar, cn } from '@aec/ui';
import type { WorkflowInsights } from '@aec/api-contracts';
import { formatNumber } from '@/shared/lib/format';
import { opLabel } from './workflow-labels';
import { AmountThresholdChart, CoverageRing, MonthlyVolumeChart } from './workflow-insights-charts';

/**
 * Insight operasional. Setiap blok **hanya tampil bila datanya bermakna**: satu
 * titik data ditampilkan sebagai angka, bukan dipaksa jadi grafik. Bentuk dipilih
 * menurut pertanyaannya: peringkat → bar horizontal, bagian-dari-keseluruhan →
 * bar bertumpuk, deret waktu → garis/area, sebaran vs ambang → histogram + garis,
 * satu nilai → ring + angka.
 */
export function WorkflowInsightsPanel({ data }: { data: WorkflowInsights }) {
  const hasTasks = data.byStep.length > 0;
  const maxStepTotal = Math.max(...data.byStep.map((s) => s.total), 0);
  const hasMonths = data.monthly.length >= 2;
  const maxDocument = data.amounts.max ?? 0;

  const coveredSteps = data.coverage.filter((c) => c.holders > 0).length;
  const uncoveredSteps = data.coverage.length - coveredSteps;

  return (
    <div className="space-y-6">
      {!hasTasks && (
        <p className="text-body-sm text-neutral-500">
          No approval tasks recorded for {data.transactionType} yet, so there is nothing to summarise.
        </p>
      )}

      {/* Satu nilai: cakupan approver sebagai ring, bukan daftar panjang. */}
      {data.coverage.length > 0 && (
        <section aria-labelledby="wf-insight-coverage">
          <h4 id="wf-insight-coverage" className="mb-2 text-body-sm font-medium text-neutral-800">Approver coverage</h4>
          <CoverageRing total={data.coverage.length} covered={coveredSteps} uncovered={uncoveredSteps} />
          {uncoveredSteps > 0 && (
            <ul className="mt-3 space-y-1.5">
              {data.coverage
                .filter((c) => c.holders === 0)
                .map((c) => (
                  <li key={`${c.stepOrder}-${c.roleCode}`} className="flex items-center gap-3 text-body-sm">
                    <span className="w-14 shrink-0 font-mono text-caption tabular-nums text-neutral-600">Step {c.stepOrder}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-caption text-neutral-700">{c.roleCode}</span>
                    <span className="shrink-0 font-mono text-caption tabular-nums text-destructive-700">
                      no holder, so the chain will stall
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>
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

      {/* Deret waktu: garis/area, bukan batang. Hanya bila lebih dari satu bulan. */}
      {hasMonths && (
        <section aria-labelledby="wf-insight-monthly">
          <h4 id="wf-insight-monthly" className="mb-2 text-body-sm font-medium text-neutral-800">Monthly volume</h4>
          <MonthlyVolumeChart monthly={data.monthly} />
        </section>
      )}

      {/* Sebaran nominal + ambang nyata tiap langkah, disatukan jadi satu gambar. */}
      {data.amounts.count > 0 && (
        <section aria-labelledby="wf-insight-amounts">
          <h4 id="wf-insight-amounts" className="mb-2 text-body-sm font-medium text-neutral-800">Document value distribution</h4>
          <AmountThresholdChart insights={data} />
          <p className="mt-2 text-caption text-neutral-500">
            {data.amounts.count} document{data.amounts.count === 1 ? '' : 's'}, smallest{' '}
            <span className="font-mono tabular-nums">{formatNumber(data.amounts.min ?? 0)}</span>, largest{' '}
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

      {/* Ambang dalam bentuk daftar, sebagai padanan tabel bagi gambar di atas. */}
      {data.thresholds.length > 0 && (
        <section aria-labelledby="wf-insight-thresholds">
          <h4 id="wf-insight-thresholds" className="mb-2 text-body-sm font-medium text-neutral-800">Approval thresholds</h4>
          <ul className="space-y-1.5">
            {data.thresholds.map((t) => {
              const crossing = data.amounts.count > 0 ? countAbove(data.amounts.buckets, t.value) : 0;
              const pct = data.amounts.count > 0 ? Math.round((crossing / data.amounts.count) * 100) : 0;
              return (
                <li key={`${t.stepOrder}-${t.field}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <span className="w-14 shrink-0 font-mono text-caption tabular-nums text-neutral-600">Step {t.stepOrder}</span>
                  <span className="flex items-center gap-2">
                    <span
                      role="img"
                      aria-label={`${crossing} of ${data.amounts.count} documents are above ${formatNumber(t.value)}`}
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100"
                    >
                      <span data-slot="threshold-fill" className="block h-full rounded-full bg-neutral-800" style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-caption tabular-nums text-neutral-700">
                    above {formatNumber(t.value)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 text-caption text-neutral-500">
            {data.thresholds.map((t) => `Step ${t.stepOrder} ${t.stepName}: ${t.op} ${formatNumber(t.value)}`).join(' · ')}
          </p>
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

/**
 * Berapa dokumen yang melewati sebuah ambang, dihitung dari batas bucket yang
 * dikirim server. Bucket yang seluruhnya di atas ambang dihitung penuh; bucket
 * yang memuat ambang di dalamnya dihitung setengah sebagai perkiraan. Batasnya
 * dipakai langsung, bukan ditebak dari label.
 */
function countAbove(buckets: WorkflowInsights['amounts']['buckets'], threshold: number): number {
  let total = 0;
  for (const b of buckets) {
    const upper = b.to ?? Number.POSITIVE_INFINITY;
    if (b.from >= threshold) total += b.count;
    else if (upper > threshold) total += Math.round(b.count / 2);
  }
  return total;
}

/** Ringkas ambang syarat untuk judul blok simulasi. */
export function ruleSummary(condition: string | null, field: string | null, op: string | null, value: number | null): string {
  if (!condition) return 'Always applies';
  return `${field ?? ''} ${opLabel(op)} ${formatNumber(value ?? 0)}`;
}
