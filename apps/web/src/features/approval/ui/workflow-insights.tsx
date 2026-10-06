import { BulletBar, StackedBar, cn } from '@aec/ui';
import type { WorkflowInsights } from '@aec/api-contracts';
import { formatNumber } from '@/shared/lib/format';
import { opLabel } from './workflow-labels';
import { AmountThresholdChart, CoverageRing, MonthlyVolumeChart } from './workflow-insights-charts';
import { WorkflowFunnel } from './workflow-funnel';

/**
 * Insight operasional, disusun bertingkat seperti dashboard yang benar:
 * ringkasan dulu, lalu satu visual utama, lalu visual sekunder, lalu rincian.
 *
 * Sebelumnya delapan blok berbobot sama ditumpuk rata — tidak ada yang memimpin,
 * dan beberapa blok mengulang data yang sama (ambang muncul tiga kali, cakupan
 * dua kali). Yang mengulang dihapus; informasinya tetap ada di bentuk yang lebih
 * tepat. Bentuk tiap blok dipilih dari **hubungan datanya**, bukan dari keinginan
 * menampilkan grafik:
 * - satu nilai → ring/angka, bukan grafik;
 * - alur dokumen → funnel, bukan bar berperingkat;
 * - bagian-dari-keseluruhan → bar bertumpuk;
 * - deret waktu → garis/area;
 * - sebaran vs ambang → histogram dengan garis;
 * - proporsi → bar, bukan kalimat.
 */
export function WorkflowInsightsPanel({ data }: { data: WorkflowInsights }) {
  const hasTasks = data.byStep.length > 0;
  const hasMonths = data.monthly.length >= 2;
  const maxDocument = data.amounts.max ?? 0;

  const coveredSteps = data.coverage.filter((c) => c.holders > 0).length;
  const uncoveredSteps = data.coverage.length - coveredSteps;

  const lastStep = data.byStep.at(-1);
  const entered = data.byStep[0]?.total ?? 0;
  const approved = lastStep?.approved ?? 0;
  const approvalRate = entered > 0 ? Math.round((approved / entered) * 100) : 0;

  return (
    <div className="space-y-6">
      {!hasTasks && data.coverage.length === 0 && (
        <p className="text-body-sm text-neutral-500">
          No approval tasks recorded for {data.transactionType} yet, so there is nothing to summarise.
        </p>
      )}

      {/* TIER 1 — Ringkasan: tiga angka yang menjawab "apakah rantai ini sehat". */}
      {data.coverage.length > 0 && (
        <section aria-labelledby="wf-tier-summary">
          <h4 id="wf-tier-summary" className="mb-3 text-caption font-medium uppercase tracking-wide text-neutral-500">
            Summary
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-neutral-200 bg-white p-3">
              <p className="text-caption text-neutral-500">Approver coverage</p>
              <CoverageRing total={data.coverage.length} covered={coveredSteps} uncovered={uncoveredSteps} compact />
            </div>
            <KpiTile
              label="Documents in chain"
              value={hasTasks ? String(entered) : '—'}
              hint={hasTasks ? `across ${data.byStep.length} step${data.byStep.length === 1 ? '' : 's'}` : 'no tasks recorded'}
            />
            <KpiTile
              label="Approval rate"
              value={hasTasks ? `${approvalRate}%` : '—'}
              hint={hasTasks ? `${approved} of ${entered} approved` : 'no tasks recorded'}
            />
          </div>
        </section>
      )}

      {/* TIER 2 — Visual utama: di mana dokumen gugur. */}
      {hasTasks && (
        <section aria-labelledby="wf-tier-flow">
          <h4 id="wf-tier-flow" className="mb-3 text-caption font-medium uppercase tracking-wide text-neutral-500">
            Where documents go
          </h4>
          <WorkflowFunnel byStep={data.byStep} />
        </section>
      )}

      {/* TIER 3 — Visual sekunder: hasil per langkah + sebaran nilai. */}
      {(hasTasks || data.amounts.count > 0) && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {hasTasks && (
            <section aria-labelledby="wf-tier-outcome">
              <h4 id="wf-tier-outcome" className="mb-3 text-caption font-medium uppercase tracking-wide text-neutral-500">
                Outcome by step
              </h4>
              <ul className="space-y-2">
                {data.byStep.map((s) => (
                  <li key={s.stepOrder} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                    <span className="min-w-[3.5rem] shrink-0 whitespace-nowrap font-mono text-caption tabular-nums text-neutral-600">
                      Step {s.stepOrder}
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
          )}

          {data.amounts.count > 0 && (
            <section aria-labelledby="wf-tier-amounts">
              <h4 id="wf-tier-amounts" className="mb-3 text-caption font-medium uppercase tracking-wide text-neutral-500">
                Document value distribution
              </h4>
              <AmountThresholdChart insights={data} />
              <p className="mt-2 text-caption text-neutral-500">
                {data.amounts.count} document{data.amounts.count === 1 ? '' : 's'}, smallest{' '}
                <span className="whitespace-nowrap font-mono tabular-nums">{formatNumber(data.amounts.min ?? 0)}</span>, largest{' '}
                <span className="whitespace-nowrap font-mono tabular-nums">{formatNumber(maxDocument)}</span>
              </p>
            </section>
          )}
        </div>
      )}

      {/* TIER 3b — Deret waktu, hanya bila lebih dari satu bulan. */}
      {hasMonths && (
        <section aria-labelledby="wf-tier-monthly">
          <h4 id="wf-tier-monthly" className="mb-3 text-caption font-medium uppercase tracking-wide text-neutral-500">
            Monthly volume
          </h4>
          <MonthlyVolumeChart monthly={data.monthly} />
        </section>
      )}

      {/* TIER 4 — Rincian: proporsi sebagai bar, bukan kalimat. */}
      {data.ruleHits.length > 0 && (
        <section aria-labelledby="wf-tier-rules">
          <h4 id="wf-tier-rules" className="mb-3 text-caption font-medium uppercase tracking-wide text-neutral-500">
            Rule impact
          </h4>
          <ul className="space-y-2">
            {data.ruleHits.map((r) => {
              const pct = data.amounts.count > 0 ? Math.round((r.matching / data.amounts.count) * 100) : 0;
              return (
                <li key={r.stepOrder} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <span className="min-w-[3.5rem] shrink-0 whitespace-nowrap font-mono text-caption tabular-nums text-neutral-600">
                    Step {r.stepOrder}
                  </span>
                  <BulletBar
                    value={r.matching}
                    max={Math.max(data.amounts.count, 1)}
                    tone="neutral"
                    label={`Step ${r.stepOrder} ${r.condition ?? 'always applies'}: ${r.matching} of ${data.amounts.count} documents match`}
                  />
                  <span className="shrink-0 whitespace-nowrap font-mono text-caption tabular-nums text-neutral-700">
                    {r.matching}/{data.amounts.count} · {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Batas kejujuran: task tidak menyimpan versi definisi yang dipakai. */}
      <p className="border-t border-neutral-200 pt-3 text-caption text-neutral-500">{data.note}</p>
    </div>
  );
}

function KpiTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <p className="text-caption text-neutral-500">{label}</p>
      <p className="mt-1 whitespace-nowrap font-mono text-h2 tabular-nums text-neutral-900">{value}</p>
      <p className="mt-0.5 text-caption text-neutral-500">{hint}</p>
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
