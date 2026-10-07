import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { DeltaBadge, EmptyState, Skeleton, Sparkline, StatusBadge } from '@aec/ui';
import type { Anomaly } from '@aec/api-contracts';
import { OPERATIONAL_ORDER, healthSegments, type MetricRow } from '../lib/dashboard-rows';

function MetricRowView({ row }: { row: MetricRow }) {
  const hasSeries = row.trend != null && row.trend.some((p) => p.value !== 0);
  return (
    <Link
      to={row.to}
      data-slot="metric-row"
      className="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b border-neutral-100 py-2 last:border-0 hover:bg-neutral-50"
    >
      <span className="flex items-center gap-1.5 text-body-sm text-neutral-700 group-hover:text-neutral-950">
        <span className="truncate">{row.label}</span>
        <ArrowUpRight className="h-3 w-3 shrink-0 text-neutral-300 group-hover:text-neutral-500" aria-hidden="true" />
      </span>

      <span data-slot="metric-spark" className="w-20 shrink-0 text-neutral-400">
        {hasSeries ? <Sparkline values={row.trend!.map((p) => p.value)} label={`${row.label} trend`} width={80} height={20} /> : null}
      </span>

      <span className="w-36 shrink-0 text-right font-mono text-body-sm tabular-nums text-neutral-900">{row.value}</span>

      <span data-slot="metric-delta" className="flex w-16 shrink-0 justify-end">
        {row.delta ? <DeltaBadge pct={row.delta.pctChange} direction={row.delta.direction} /> : <span className="text-caption text-neutral-300">—</span>}
      </span>
    </Link>
  );
}

export function LedgerSection({ title, rows }: { title: string; rows: MetricRow[] }) {
  return (
    <section>
      <h2 className="text-overline uppercase text-neutral-500">{title}</h2>
      <div className="mt-1">
        {rows.map((row) => (
          <MetricRowView key={row.key} row={row} />
        ))}
      </div>
    </section>
  );
}

export function PortfolioHealthBar({ counts }: { counts: Record<string, number> }) {
  const segments = healthSegments(counts);
  const total = segments.reduce((s, seg) => s + seg.count, 0);
  if (total === 0) {
    return <p className="text-body-sm text-neutral-500">No projects in this scope.</p>;
  }
  return (
    <div>
      <div
        data-slot="health-bar"
        role="img"
        aria-label={segments.map((s) => `${s.count} ${s.label.toLowerCase()}`).join(', ')}
        className="flex h-2.5 overflow-hidden rounded-sm bg-neutral-100"
      >
        {segments.map((s) => (
          <div key={s.key} className={s.className} style={{ width: `${(s.count / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-caption text-neutral-600">
            <span className={`inline-block h-2 w-2 rounded-full ${s.className}`} aria-hidden="true" />
            <span>{s.label}</span>
            <span className="font-mono tabular-nums text-neutral-500">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Anomaly triage dengan filter severity. Berbeda dari widget `AnomalyTriage`
 * (yang mengelompokkan tanpa filter), ini mempertahankan perilaku dashboard:
 * tombol All/HIGH/MEDIUM/LOW + daftar datar.
 */
export function AnomalyTriageFilterable({ anomalies, total }: { anomalies: Anomaly[]; total: number }) {
  const [filter, setFilter] = useState<Anomaly['severity'] | ''>('');
  const shown = filter ? anomalies.filter((a) => a.severity === filter) : anomalies;
  const counts = Object.fromEntries(OPERATIONAL_ORDER.map((sev) => [sev, anomalies.filter((a) => a.severity === sev).length]));

  if (total === 0) {
    return (
      <EmptyState
        tone="success"
        icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
        title="No anomalies"
        description="Nothing flagged across the portfolio."
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={filter === ''}
          onClick={() => setFilter('')}
          className={`rounded px-2 py-0.5 text-caption transition-colors duration-fast ${filter === '' ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
        >
          All {total}
        </button>
        {OPERATIONAL_ORDER.map((sev) => (
          <button
            key={sev}
            type="button"
            aria-pressed={filter === sev}
            onClick={() => setFilter(filter === sev ? '' : sev)}
            className={`rounded px-2 py-0.5 text-caption capitalize transition-colors duration-fast ${filter === sev ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            {sev.charAt(0) + sev.slice(1).toLowerCase()} {counts[sev] ?? 0}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-2 text-body-sm text-neutral-500">No anomalies at this severity.</p>
      ) : (
        <ul>
          {shown.map((a, i) => (
            <li key={`${a.type}-${i}`} className="flex items-center gap-3 border-b border-neutral-100 py-2 last:border-0">
              <StatusBadge status={a.severity} />
              <span className="font-mono text-caption text-neutral-500">{a.type}</span>
              {a.projectCode && <span className="font-mono text-caption text-neutral-500">{a.projectCode}</span>}
              <span className="min-w-0 flex-1 truncate text-body-sm text-neutral-700">{a.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LedgerSkeleton() {
  return (
    <div aria-label="Loading dashboard" className="space-y-6">
      <Skeleton className="h-20 w-full" />
      {[0, 1].map((s) => (
        <div key={s} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b border-neutral-100 py-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
