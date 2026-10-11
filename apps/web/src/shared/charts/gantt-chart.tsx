import { useMemo, useState } from 'react';
import type { GanttRow } from '@aec/api-contracts';
import { GANTT_COLORS } from './chart-tokens';

export interface GanttChartProps {
  rows: GanttRow[];
  /** Rentang sumbu (ISO). Bila kosong, diturunkan dari baris. */
  from?: string;
  to?: string;
  /** Tampilkan garis "hari ini". Default true. */
  showToday?: boolean;
  className?: string;
}

const DAY = 86_400_000;
const LABEL_W = 220;

/** Bulan-bulan yang tercakup rentang, untuk tick sumbu. */
function monthTicks(fromMs: number, toMs: number): Array<{ label: string; pct: number }> {
  const ticks: Array<{ label: string; pct: number }> = [];
  const start = new Date(fromMs);
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const span = toMs - fromMs || 1;
  // Batasi jumlah tick agar tidak penuh (maks ~12).
  const monthsTotal = Math.max(1, Math.round(span / (30 * DAY)));
  const step = Math.max(1, Math.ceil(monthsTotal / 12));
  let i = 0;
  while (cur.getTime() <= toMs) {
    if (i % step === 0) {
      const pct = Math.min(100, Math.max(0, ((cur.getTime() - fromMs) / span) * 100));
      const label = cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      ticks.push({ label, pct });
    }
    cur.setUTCMonth(cur.getUTCMonth() + 1);
    i += 1;
  }
  return ticks;
}

/**
 * Gantt chart: baris ber-jadwal pada sumbu waktu bersama. Menampilkan bar
 * rencana (baseline, ghost) + bar jadwal + progress di dalam bar + diamond
 * milestone + garis "hari ini". Aktivitas jalur kritis diberi warna kritis.
 *
 * Aksesibel: `role="img"` + `aria-label` memuat tiap baris (label + tanggal),
 * karena Gantt tak terbaca sebagai tabel.
 */
export function GanttChart({ rows, from, to, showToday = true, className }: GanttChartProps) {
  // "Sekarang" dibaca sekali saat mount (pola React), bukan saat render.
  const [now] = useState(() => Date.now());
  const { min, span, ticks, todayPct } = useMemo(() => {
    const starts = rows.map((r) => new Date(r.start).getTime());
    const ends = rows.map((r) => (r.end ? new Date(r.end).getTime() : now));
    const baselineStarts = rows.map((r) => (r.baselineStart ? new Date(r.baselineStart).getTime() : NaN)).filter((n) => Number.isFinite(n));
    const baselineEnds = rows.map((r) => (r.baselineEnd ? new Date(r.baselineEnd).getTime() : NaN)).filter((n) => Number.isFinite(n));
    const all = [...starts, ...ends, ...baselineStarts, ...baselineEnds, now];
    const lo = from ? new Date(from).getTime() : Math.min(...all);
    const hi = to ? new Date(to).getTime() : Math.max(...all);
    const sp = Math.max(hi - lo, DAY);
    return {
      min: lo,
      span: sp,
      ticks: monthTicks(lo, hi),
      todayPct: Math.min(100, Math.max(0, ((now - lo) / sp) * 100)),
    };
  }, [rows, from, to, now]);

  const pct = (iso: string | null) => (iso == null ? null : Math.min(100, Math.max(0, ((new Date(iso).getTime() - min) / span) * 100)));

  if (rows.length === 0) {
    return <p className="text-body-sm text-neutral-500">No scheduled activities.</p>;
  }

  const label = `Gantt: ${rows.map((r) => `${r.label} ${r.start.slice(0, 10)} to ${(r.end ?? 'ongoing').slice(0, 10)}`).join('; ')}`;

  return (
    <div className={className}>
      {/* Sumbu waktu */}
      <div className="flex">
        <span className="shrink-0" style={{ width: LABEL_W }} />
        <div role="img" aria-label={label} className="relative h-5 flex-1">
          {ticks.map((t) => (
            <span key={t.label + t.pct} className="absolute top-0 -translate-x-1/2 text-caption text-neutral-400" style={{ left: `${t.pct}%` }}>{t.label}</span>
          ))}
        </div>
      </div>

      <div className="relative flex flex-col gap-1">
        {/* Garis "hari ini" membentang seluruh daftar */}
        {showToday && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-20" style={{ left: `calc(${LABEL_W}px + ${todayPct}% * (100% - ${LABEL_W}px) / 100%)` }}>
            <span className="block h-full w-px" style={{ backgroundColor: GANTT_COLORS.today }} />
          </span>
        )}
        {rows.map((r) => {
          const s = pct(r.start);
          const e = pct(r.end ?? new Date().toISOString());
          const left = s ?? 0;
          const width = Math.max(0.8, (e ?? 100) - left);
          const bs = pct(r.baselineStart);
          const be = pct(r.baselineEnd);
          const isMilestone = r.milestone === true;
          const barColor = r.isCriticalPath ? GANTT_COLORS.critical : GANTT_COLORS.normal;
          return (
            <div key={r.id} className="flex items-center gap-0">
              <span className="shrink-0 truncate pr-3 text-caption text-neutral-700" style={{ width: LABEL_W }} title={`${r.group} · ${r.label}`}>
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ backgroundColor: r.isCriticalPath ? GANTT_COLORS.critical : GANTT_COLORS.normal }} aria-hidden="true" />
                {r.label}
              </span>
              <span className="relative h-5 flex-1">
                {/* Baseline (rencana beku) — ghost bar di belakang */}
                {bs != null && be != null && !isMilestone && (
                  <span aria-hidden="true" className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-sm opacity-60" style={{ left: `${bs}%`, width: `${Math.max(0.5, be - bs)}%`, backgroundColor: GANTT_COLORS.baseline }} title={`Baseline ${r.baselineStart?.slice(0, 10)} – ${r.baselineEnd?.slice(0, 10)}`} />
                )}
                {isMilestone ? (
                  <span
                    data-slot="gantt-milestone"
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45"
                    style={{ left: `calc(${left}% - 5px)`, backgroundColor: r.isCriticalPath ? GANTT_COLORS.critical : GANTT_COLORS.milestone }}
                    title={`${r.label}: ${r.start.slice(0, 10)}${r.status ? ` (${r.status})` : ''}`}
                  />
                ) : (
                  <span
                    data-slot="gantt-bar"
                    data-critical={r.isCriticalPath ? 'true' : undefined}
                    className="absolute top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-sm"
                    style={{ left: `${left}%`, width: `${width}%`, backgroundColor: barColor }}
                    title={`${r.label}: ${r.start.slice(0, 10)} – ${(r.end ?? 'ongoing').slice(0, 10)}${r.progress != null ? ` · ${Math.round(r.progress)}%` : ''}`}
                  >
                    {r.progress != null && r.progress > 0 && (
                      <span data-slot="gantt-progress" className="block h-full bg-white/35" style={{ width: `${Math.min(100, r.progress)}%` }} />
                    )}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 pl-1 text-caption text-neutral-500">
        <li className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm" style={{ backgroundColor: GANTT_COLORS.normal }} aria-hidden="true" />Scheduled</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm" style={{ backgroundColor: GANTT_COLORS.critical }} aria-hidden="true" />Critical path</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm opacity-60" style={{ backgroundColor: GANTT_COLORS.baseline }} aria-hidden="true" />Baseline</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rotate-45" style={{ backgroundColor: GANTT_COLORS.milestone }} aria-hidden="true" />Milestone</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-px" style={{ backgroundColor: GANTT_COLORS.today }} aria-hidden="true" />Today</li>
      </ul>
    </div>
  );
}
