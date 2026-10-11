import { useMemo } from 'react';
import { RiskHeatmap } from '@aec/ui';
import type { ProjectSchedule, ProjectSummary, ProjectGantt } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';
import { AreaTrend, CalendarHeatmap, Donut, FunnelSteps, Lollipop, RadarProfile, TreemapChart } from '@/shared/charts';

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

/** Distribusi kategori sebagai donut (bagian-dari-keseluruhan). */
export function MixDonut({ title, data, emptyHint }: { title: string; data: Array<{ key: string; count: number }>; emptyHint?: string }) {
  const slices = useMemo(() => data.map((d) => ({ key: label(d.key), value: d.count })), [data]);
  if (slices.length === 0) {
    return (
      <section aria-label={title} className="flex flex-col gap-2">
        <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
        <p className="text-body-sm text-neutral-400">{emptyHint ?? 'None recorded.'}</p>
      </section>
    );
  }
  return <Donut title={title} data={slices} format={(n) => String(n)} />;
}

/** Risk heatmap (korelasi L×I). */
export function ProjectRiskHeatmap({ cells }: { cells: Array<{ likelihood: number; impact: number; count: number }> }) {
  if (cells.length === 0) return <p className="text-body-sm text-neutral-400">No open risks.</p>;
  return <RiskHeatmap cells={cells} />;
}

/**
 * Profil kesehatan proyek (radar) — cost/schedule/risk/quality/HSE dinormalkan
 * ke 0–100 (makin tinggi makin sehat), supaya lima dimensi berbeda satuan bisa
 * dibandingkan sebagai satu profil.
 */
export function HealthRadar({ summary }: { summary: ProjectSummary }) {
  const axes = useMemo(() => {
    const cost = summary.cost.cpi == null ? 60 : Math.min(100, Math.max(0, summary.cost.cpi * 100));
    const schedule = Math.min(100, Math.max(0, 100 + summary.schedule.variance * 2));
    const risk = Math.max(0, 100 - summary.domains.governance.riskOpen * 15);
    const quality = Math.max(0, 100 - summary.domains.quality.ncrOpen * 15);
    const hse = Math.max(0, 100 - summary.domains.hse.incidentOpen * 20);
    return [
      { axis: 'Cost', value: cost },
      { axis: 'Schedule', value: schedule },
      { axis: 'Risk', value: risk },
      { axis: 'Quality', value: quality },
      { axis: 'HSE', value: hse },
    ];
  }, [summary]);
  return <RadarProfile title="Project health (higher is healthier)" axes={axes} format={(n) => `${Math.round(n)}`} />;
}

/** Aliran penagihan sebagai funnel bertahap (nilai ringkas agar tak meluber). */
export function BillingFunnel({ summary }: { summary: ProjectSummary }) {
  const { contractValue } = summary.cost;
  const b = summary.analytics.billing;
  const steps = [
    { key: 'Contract', value: contractValue },
    { key: 'Certified', value: b.certified },
    { key: 'Billed', value: b.billed },
    { key: 'Collected', value: b.collected },
  ];
  return <FunnelSteps title="Billing flow" steps={steps} format={formatIdrCompact} />;
}

/**
 * S-curve rencana vs aktual sebagai area ber-sumbu (bukan sparkline mini).
 * Dua seri: kumulatif rencana (%), kumulatif aktual (%).
 */
export function SCurveCompare({ schedule }: { schedule: ProjectSchedule }) {
  const planned = schedule.plannedCurve.map((p) => ({ period: p.period, value: p.plannedPct }));
  const actual = schedule.actualProgressCurve.map((p) => ({ period: p.period, value: p.pct }));
  const hasActual = actual.length >= 2;
  if (planned.length < 2 && !hasActual) {
    return <p className="text-body-sm text-neutral-500">No time-phased budget — S-curve unavailable.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <AreaTrend title="Planned progress (cumulative %)" series={planned} valueLabel="Planned %" />
      {hasActual ? (
        <AreaTrend title="Actual progress (cumulative %)" series={actual} valueLabel="Actual %" />
      ) : (
        <p className="text-caption text-neutral-400">No certified progress claims yet — actual curve unavailable.</p>
      )}
    </div>
  );
}

/** Belanja per vendor sebagai treemap (komposisi proporsional). */
export function VendorTreemap({ data }: { data: Array<{ key: string; value: number }> }) {
  return <TreemapChart title="Spend by vendor" data={data} format={formatIdrCompact} />;
}

/** Ranking vendor sebagai lollipop. */
export function VendorRanking({ data }: { data: Array<{ key: string; value: number }> }) {
  return <Lollipop title="Top vendors by value" data={data} format={formatIdrCompact} />;
}

/** Tren NCR/HSE per periode (garis ber-sumbu). */
export function TrendArea({ title, series }: { title: string; series: Array<{ period: string; value: number }> }) {
  return <AreaTrend title={title} series={series} valueLabel={title} />;
}

/** Kepadatan daily report per hari (calendar heatmap). */
export function ReportsCalendar({ days }: { days: Array<{ date: string; count: number }> }) {
  return <CalendarHeatmap title="Daily reports per day" days={days} />;
}

export type { ProjectGantt };
