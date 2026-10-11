import { useMemo } from 'react';
import { RiskHeatmap, Sparkline, StackedBar, StageBars } from '@aec/ui';
import type { ProjectSchedule, ProjectSummary } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';

const MIX_LABEL: Record<string, string> = {
  MINOR: 'Minor', MAJOR: 'Major', CRITICAL: 'Critical', LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High',
  DRAFT: 'Draft', PUBLISHED: 'Published', SUPERSEDED: 'Superseded', NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress', SUBMITTED: 'Submitted', APPROVED: 'Approved', ISSUED: 'Issued',
};

const label = (key: string) => {
  const [prefix, rest] = key.includes(':') ? key.split(':') : [null, key];
  const human = MIX_LABEL[rest ?? key] ?? (rest ?? key).replace(/_/g, ' ').toLowerCase();
  return prefix ? `${prefix}: ${human}` : human;
};

/**
 * Distribusi kategori (FT: *distribution*) — bar per kategori. Visual dipilih
 * dari bentuk data (kategori + hitungan), bukan selera. Tiap bar ber-`title`
 * sehingga angka terbaca tanpa warna.
 */
export function MixBars({ title, data, emptyHint }: { title: string; data: Array<{ key: string; count: number }>; emptyHint?: string }) {
  const stages = useMemo(() => data.map((d) => ({ stage: label(d.key), count: d.count, value: d.count })), [data]);
  if (stages.length === 0) {
    return (
      <section aria-label={title} className="flex flex-col gap-2">
        <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
        <p className="text-body-sm text-neutral-400">{emptyHint ?? 'None recorded.'}</p>
      </section>
    );
  }
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
      <StageBars stages={stages} format={String} />
    </section>
  );
}

/**
 * Risk heatmap (FT: *correlation*) — kepadatan risiko pada matriks likelihood ×
 * impact. Memakai primitif `RiskHeatmap` yang sudah ada (ramp satu hue +
 * `title` per sel).
 */
export function ProjectRiskHeatmap({ cells }: { cells: Array<{ likelihood: number; impact: number; count: number }> }) {
  if (cells.length === 0) {
    return <p className="text-body-sm text-neutral-400">No open risks.</p>;
  }
  return <RiskHeatmap cells={cells} />;
}

/**
 * S-curve rencana vs aktual (FT: *change over time*). Dua garis pada skala yang
 * sama: rencana (kumulatif %, dari time-phased budget) dan aktual (kumulatif %,
 * dari progress claim). Bila tak ada data aktual, ditampilkan jujur — bukan
 * garis datar palsu.
 */
export function SCurveCompare({ schedule }: { schedule: ProjectSchedule }) {
  const planned = schedule.plannedCurve.map((p) => p.plannedPct);
  const actual = schedule.actualProgressCurve.map((p) => p.pct);
  const hasActual = actual.length >= 2;

  if (planned.length < 2 && !hasActual) {
    return <p className="text-body-sm text-neutral-500">No time-phased budget — S-curve unavailable.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-caption text-neutral-600">
        <li className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-neutral-400" aria-hidden="true" />Planned</li>
        <li className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-racing-red-600" aria-hidden="true" />Actual (progress claim)</li>
      </ul>
      <div className="flex flex-col gap-2">
        {planned.length >= 2 && (
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-caption text-neutral-500">Planned</span>
            <Sparkline values={planned} width={520} height={56} stroke="#a1a1aa" label="Planned progress" className="w-full" />
            <span className="w-12 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-600">{planned[planned.length - 1]}%</span>
          </div>
        )}
        {hasActual ? (
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-caption text-neutral-500">Actual</span>
            <Sparkline values={actual} width={520} height={56} stroke="#dc2626" label="Actual progress" className="w-full" />
            <span className="w-12 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-600">{actual[actual.length - 1]}%</span>
          </div>
        ) : (
          <p className="text-caption text-neutral-400">No certified progress claims yet — actual curve unavailable.</p>
        )}
      </div>
      {schedule.actualCostCurve.length >= 2 && (
        <p className="text-caption text-neutral-500">
          Actual cost to date{' '}
          <span className="font-mono tabular-nums text-neutral-700">{formatIdr(schedule.actualCostCurve[schedule.actualCostCurve.length - 1]!.cumulative)}</span>
          {' '}across {schedule.actualCostCurve.length} periods
        </p>
      )}
    </div>
  );
}

/**
 * Bagian-dari-keseluruhan penagihan (FT: *part-to-whole*) — billed & collected
 * terhadap certified. Satu bar berjenjang, bukan tiga kartu.
 */
export function BillingBar({ billing, contractValue }: { billing: ProjectSummary['analytics']['billing']; contractValue: number }) {
  const outstanding = Math.max(0, billing.certified - billing.billed);
  const unbilled = Math.max(0, billing.billed - billing.collected);
  return (
    <div className="flex flex-col gap-2">
      <StackedBar
        segments={[
          { value: billing.collected, tone: 'success', label: 'Collected' },
          { value: unbilled, tone: 'neutral-mid', label: 'Billed, not collected' },
          { value: outstanding, tone: 'warning', label: 'Certified, not billed' },
        ]}
        format={formatIdr}
      />
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-caption text-neutral-600">
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success-500" aria-hidden="true" />Collected <span className="font-mono tabular-nums text-neutral-700">{formatIdr(billing.collected)}</span></li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-400" aria-hidden="true" />Billed <span className="font-mono tabular-nums text-neutral-700">{formatIdr(billing.billed)}</span></li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning-500" aria-hidden="true" />Certified <span className="font-mono tabular-nums text-neutral-700">{formatIdr(billing.certified)}</span></li>
        <li className="ml-auto text-neutral-500">Contract <span className="font-mono tabular-nums text-neutral-700">{formatIdr(contractValue)}</span></li>
      </ul>
    </div>
  );
}

/**
 * Tren indeks (FT: *change over time*) — CPI/SPI sebagai deret. Bila hanya ada
 * satu titik, tampilkan angkanya saja (sparkline satu titik tak bermakna).
 */
export function IndexTrend({ values, label: lbl, unit = '' }: { values: number[]; label: string; unit?: string }) {
  const last = values[values.length - 1];
  const ok = last != null && last >= 1;
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 shrink-0 text-caption font-medium text-neutral-500">{lbl}</span>
      {values.length >= 2 ? (
        <Sparkline values={values} width={160} height={28} stroke={ok ? '#16a34a' : '#d97706'} label={`${lbl} trend`} />
      ) : (
        <span className="text-caption text-neutral-400">single value</span>
      )}
      <span className={`ml-auto font-mono text-body-sm tabular-nums ${last == null ? 'text-neutral-400' : ok ? 'text-financial-positive-600' : 'text-warning-600'}`}>
        {last == null ? '—' : `${last}${unit}`}
      </span>
    </div>
  );
}
