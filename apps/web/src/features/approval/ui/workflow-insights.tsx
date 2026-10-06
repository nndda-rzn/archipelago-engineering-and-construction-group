import { BulletBar } from '@aec/ui';
import type { WorkflowInsights } from '@aec/api-contracts';
import { formatNumber } from '@/shared/lib/format';
import { opLabel } from './workflow-labels';
import { AmountThresholdChart, CoverageRing, MonthlyVolumeChart } from './workflow-insights-charts';
import { WorkflowStepOutcomes } from './workflow-step-outcomes';

/**
 * Insight operasional, disusun menurut **cakupan datanya** — bukan menurut
 * keinginan menampilkan grafik.
 *
 * Masalah lama: sebagian angka dihitung per DEFINISI (coverage — berapa langkah
 * punya pemegang), sebagian per JENIS TRANSAKSI (task, nominal, volume bulanan).
 * Keduanya disandingkan tanpa label, jadi pengguna menyangka keduanya tentang hal
 * yang sama. Sekarang dua cakupan itu dipisah dan **dinyatakan**:
 *
 * - **This version** — pertanyaan "apakah rantai yang saya lihat bisa jalan".
 * - **Across all versions** — pertanyaan "bagaimana dokumen mengalir lewat jenis
 *   transaksi ini"; task tidak menyimpan versi untuk data lama, dan
 *   `versionBreakdown` memperlihatkan campurannya alih-alih menyembunyikannya.
 *
 * Bentuk tiap blok mengikuti hubungan datanya:
 * - satu nilai → ring/angka, bukan grafik;
 * - hasil per langkah → bar bertumpuk (bukan funnel; lihat `workflow-step-outcomes`);
 * - bagian-dari-keseluruhan → bar bertumpuk;
 * - deret waktu → garis/area;
 * - sebaran vs ambang → histogram dengan garis;
 * - proporsi → bar, bukan kalimat.
 */
export function WorkflowInsightsPanel({ data }: { data: WorkflowInsights }) {
  const hasTasks = data.byStep.length > 0;
  const hasMonths = data.monthly.length >= 2;

  const coveredSteps = data.coverage.filter((c) => c.holders > 0).length;
  const uncoveredSteps = data.coverage.length - coveredSteps;

  const { documents, scope } = data;
  // Versi lain yang benar-benar punya task — disebut namanya, bukan disembunyikan.
  const otherVersions = scope.versionBreakdown.filter((b) => b.definitionId !== scope.requested.definitionId);
  const unknownVersionTasks = otherVersions
    .filter((b) => b.definitionId === null)
    .reduce((n, b) => n + b.tasks, 0);

  const nothingAtAll = !hasTasks && data.coverage.length === 0;

  return (
    <div className="space-y-6">
      {nothingAtAll && (
        <p className="text-pretty text-body-sm text-neutral-500">
          No approval tasks recorded for {data.transactionType} yet, so there is nothing to summarise.
        </p>
      )}

      {/* ── THIS VERSION — pertanyaan: apakah rantai ini bisa jalan? ────────── */}
      {data.coverage.length > 0 && (
        <section aria-labelledby="wf-scope-version">
          <ScopeHeader
            id="wf-scope-version"
            title="This version"
            detail={`${scope.requested.code} v${scope.requested.version}`}
          />
          <div className="rounded-md border border-neutral-200 bg-white p-3">
            <p className="text-caption text-neutral-500">Approver coverage</p>
            <CoverageRing total={data.coverage.length} covered={coveredSteps} uncovered={uncoveredSteps} compact />
          </div>
        </section>
      )}

      {/* ── ACROSS ALL VERSIONS — pertanyaan: bagaimana dokumen mengalir? ───── */}
      {(hasTasks || data.amounts.count > 0) && (
        <section aria-labelledby="wf-scope-type" className="space-y-6">
          <ScopeHeader
            id="wf-scope-type"
            title="Across all versions"
            detail={`every task recorded for ${data.transactionType}`}
          />

          {/* Campuran versi diperlihatkan, bukan disembunyikan. */}
          {otherVersions.length > 0 && (
            <p className="text-pretty rounded-md bg-neutral-50 px-3 py-2 text-caption text-neutral-600">
              Includes{' '}
              {otherVersions.map((b, i) => (
                <span key={b.definitionId ?? 'unknown'} className="whitespace-nowrap">
                  {i > 0 ? ', ' : ''}
                  <span className="font-mono tabular-nums">{b.tasks}</span>{' '}
                  {b.definitionId === null
                    ? `task${b.tasks === 1 ? '' : 's'} with no recorded version`
                    : `task${b.tasks === 1 ? '' : 's'} from v${b.version ?? '?'}`}
                </span>
              ))}
              {unknownVersionTasks > 0
                ? '. Tasks recorded before versions were tracked cannot be attributed to a version.'
                : '.'}
            </p>
          )}

          {/* KPI: angka per DOKUMEN, bukan penjumlahan baris langkah. */}
          {hasTasks && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <KpiTile
                label="Documents in chain"
                value={String(documents.entered)}
                hint={`across ${data.byStep.length} step${data.byStep.length === 1 ? '' : 's'}`}
              />
              <KpiTile
                label="Approval rate"
                value={`${documents.approvalRate}%`}
                hint={`${documents.approved} of ${documents.entered} fully approved`}
              />
              <KpiTile
                label="Still open"
                value={String(documents.pending)}
                hint={`${documents.rejected} rejected`}
              />
            </div>
          )}

          {/* Hasil per langkah — menggantikan funnel DAN blok outcome terpisah. */}
          {hasTasks && (
            <div>
              <h4 className="mb-3 text-caption font-medium uppercase tracking-wide text-neutral-500">
                Documents by step
              </h4>
              <WorkflowStepOutcomes byStep={data.byStep} />
            </div>
          )}

          {/* Visual sekunder: sebaran nilai + volume bulanan. */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {data.amounts.count > 0 && (
              <div>
                <h4 className="mb-3 text-caption font-medium uppercase tracking-wide text-neutral-500">
                  Document value distribution
                </h4>
                <AmountThresholdChart insights={data} />
              </div>
            )}

            {hasMonths && (
              <div>
                <h4 className="mb-3 text-caption font-medium uppercase tracking-wide text-neutral-500">
                  Monthly volume
                </h4>
                <MonthlyVolumeChart monthly={data.monthly} />
              </div>
            )}
          </div>

          {/* Rincian: proporsi sebagai bar, bukan kalimat. */}
          {data.ruleHits.length > 0 && (
            <div>
              <h4 className="mb-3 text-caption font-medium uppercase tracking-wide text-neutral-500">
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
            </div>
          )}
        </section>
      )}

      {/* Batas kejujuran: task tidak menyimpan versi definisi untuk data lama. */}
      <p className="border-t border-neutral-200 pt-3 text-pretty text-caption text-neutral-500">{data.note}</p>
    </div>
  );
}

/** Judul cakupan: menyatakan SKALA data, bukan sekadar nama blok. */
function ScopeHeader({ id, title, detail }: { id: string; title: string; detail: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-neutral-200 pb-1.5">
      <h3 id={id} className="text-body-sm font-semibold text-neutral-900">{title}</h3>
      <span className="min-w-0 truncate font-mono text-caption text-neutral-500" title={detail}>{detail}</span>
    </div>
  );
}

function KpiTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <p className="text-caption text-neutral-500">{label}</p>
      <p className="mt-1 whitespace-nowrap font-mono text-h2 tabular-nums text-neutral-900">{value}</p>
      <p className="mt-0.5 text-pretty text-caption text-neutral-500">{hint}</p>
    </div>
  );
}

/** Ringkas ambang syarat untuk judul blok simulasi. */
export function ruleSummary(condition: string | null, field: string | null, op: string | null, value: number | null): string {
  if (!condition) return 'Always applies';
  return `${field ?? ''} ${opLabel(op)} ${formatNumber(value ?? 0)}`;
}
