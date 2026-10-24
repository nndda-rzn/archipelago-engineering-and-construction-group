import { useMemo } from 'react';
import type { ProjectSchedule } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';

/**
 * Zona C — trajektori.
 *
 * S-curve dengan pita variance, mengikuti bentuk yang disebut PMMilestone
 * sebagai "classic S-curve with variance bands". Lebar pita ADALAH variance:
 * jarak rencana ke earned = SV, jarak earned ke actual cost = CV. Angka
 * variance yang berdiri sendiri sebagai kartu kehilangan dimensi waktu —
 * pita menunjukkan KAPAN penyimpangan mulai melebar.
 *
 * EAC digambar sebagai kelanjutan kurva, bukan angka terpisah, supaya proyeksi
 * terbaca sebagai arah — bukan potongan informasi.
 */
export interface ControlsTrajectoryProps {
  schedule: ProjectSchedule;
  bac: number;
  eac: number | null;
  dataDateIndex: number;
}

const W = 912;
const H = 248;
const PAD = { top: 16, right: 8, bottom: 28, left: 8 };

const COLORS = {
  planned: 'text-neutral-400',
  earned: 'text-neutral-900',
  cost: 'text-destructive-600',
  bandSv: 'text-neutral-900',
  bandCv: 'text-destructive-600',
};

export function ControlsTrajectory({ schedule, bac, eac, dataDateIndex }: ControlsTrajectoryProps) {
  const { planned, earned, cost, xOf, yOf, periods } = useMemo(() => {
    const plannedPts = schedule.plannedCurve.map((p) => ({ period: p.period, value: p.plannedCumulative }));
    const earnedPts = schedule.actualProgressCurve.map((p) => ({
      period: p.period,
      // Nilai earned = porsi kumulatif klaim terhadap total, dipetakan ke BAC.
      value: bac * (p.pct / 100),
    }));
    const costPts = schedule.actualCostCurve.map((p) => ({ period: p.period, value: p.cumulative }));

    const all = [...plannedPts.map((p) => p.value), ...costPts.map((p) => p.value), eac ?? 0, bac];
    const max = Math.max(...all, 1);
    const maxY = max * 1.08;

    const allPeriods = [...new Set([...plannedPts, ...earnedPts, ...costPts].map((p) => p.period))].sort((a, b) =>
      a.localeCompare(b),
    );
    // Dua periode proyeksi setelah titik terakhir agar EAC punya tempat.
    const lastPeriod = allPeriods[allPeriods.length - 1] ?? '2026-Q1';
    const projPeriods = [0, 1].map((i) => {
      const q = /^(\d{4})-Q([1-4])$/.exec(lastPeriod);
      if (!q) return lastPeriod;
      let y = Number(q[1]);
      let n = Number(q[2]) + i + 1;
      while (n > 4) {
        n -= 4;
        y += 1;
      }
      return `${y}-Q${n}`;
    });
    const axis = [...allPeriods, ...projPeriods];

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    return {
      planned: plannedPts,
      earned: earnedPts,
      cost: costPts,
      periods: axis,
      xOf: (period: string) => {
        const i = axis.indexOf(period);
        return PAD.left + (axis.length > 1 ? (i / (axis.length - 1)) * plotW : 0);
      },
      yOf: (v: number) => PAD.top + plotH - (Math.min(v, maxY) / maxY) * plotH,
    };
  }, [schedule, bac, eac]);

  const line = (pts: Array<{ period: string; value: number }>) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.period).toFixed(1)},${yOf(p.value).toFixed(1)}`).join(' ');

  // Pita SV: antara kurva rencana dan earned, hanya pada periode yang punya keduanya.
  const svBand = useMemo(() => {
    const common = planned.filter((p) => earned.some((e) => e.period === p.period));
    if (common.length < 2) return null;
    const top = common.map((p) => `${xOf(p.period).toFixed(1)},${yOf(p.value).toFixed(1)}`);
    const bottom = [...common].reverse().map((p) => {
      const e = earned.find((x) => x.period === p.period)!;
      return `${xOf(p.period).toFixed(1)},${yOf(e.value).toFixed(1)}`;
    });
    return `M${top.join(' L')} L${bottom.join(' L')} Z`;
  }, [planned, earned, xOf, yOf]);

  // Pita CV: antara earned dan actual cost.
  const cvBand = useMemo(() => {
    const common = earned.filter((e) => cost.some((c) => c.period === e.period));
    if (common.length < 2) return null;
    const top = common.map((e) => `${xOf(e.period).toFixed(1)},${yOf(e.value).toFixed(1)}`);
    const bottom = [...common].reverse().map((e) => {
      const c = cost.find((x) => x.period === e.period)!;
      return `${xOf(e.period).toFixed(1)},${yOf(c.value).toFixed(1)}`;
    });
    return `M${top.join(' L')} L${bottom.join(' L')} Z`;
  }, [earned, cost, xOf, yOf]);

  const datePeriod = periods[Math.min(dataDateIndex, periods.length - 1)];

  return (
    <section aria-label="Cost and schedule trajectory" className="min-w-0 border-t border-neutral-300">
      <p className="mb-2 mt-2 font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ TRAJEKTORI ]</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          `Planned value ends at ${formatIdrCompact(planned[planned.length - 1]?.value ?? 0)}, ` +
          `earned value at ${formatIdrCompact(earned[earned.length - 1]?.value ?? 0)}, ` +
          `actual cost at ${formatIdrCompact(cost[cost.length - 1]?.value ?? 0)}.` +
          (eac != null ? ` Forecast at completion ${formatIdrCompact(eac)} against budget ${formatIdrCompact(bac)}.` : '')
        }
      >
        {/* Garis BAC — ambang. Tanpa ambang, tidak ada pemicu keputusan. */}
        <line x1={PAD.left} y1={yOf(bac)} x2={W - PAD.right} y2={yOf(bac)} stroke="currentColor" className="text-neutral-500" strokeWidth={1} strokeDasharray="4 3" />
        <text x={PAD.left + 4} y={yOf(bac) - 4} className="fill-current text-[10px] uppercase tracking-wide text-neutral-500">
          BAC {formatIdrCompact(bac)}
        </text>

        {/* Pita variance */}
        {svBand && <path d={svBand} className={`fill-current ${COLORS.bandSv}`} fillOpacity={0.06} />}
        {cvBand && <path d={cvBand} className={`fill-current ${COLORS.bandCv}`} fillOpacity={0.08} />}

        {/* Garis data date */}
        {datePeriod && (
          <>
            <line x1={xOf(datePeriod)} y1={PAD.top} x2={xOf(datePeriod)} y2={H - PAD.bottom} stroke="currentColor" className="text-neutral-300" strokeWidth={1} />
            <text x={xOf(datePeriod) + 4} y={PAD.top + 10} className="fill-current text-[10px] uppercase tracking-wide text-neutral-500">
              data date
            </text>
          </>
        )}

        {/* Kurva */}
        {planned.length > 1 && <path d={line(planned)} fill="none" stroke="currentColor" className={COLORS.planned} strokeWidth={1.5} />}
        {earned.length > 1 && <path d={line(earned)} fill="none" stroke="currentColor" className={COLORS.earned} strokeWidth={1.5} />}
        {cost.length > 1 && <path d={line(cost)} fill="none" stroke="currentColor" className={COLORS.cost} strokeWidth={1.5} strokeDasharray="5 3" />}

        {/* EAC: kelanjutan kurva, bukan angka terpisah. */}
        {eac != null && cost.length > 0 && (
          <>
            <line
              x1={xOf(cost[cost.length - 1]!.period)}
              y1={yOf(cost[cost.length - 1]!.value)}
              x2={xOf(periods[periods.length - 1]!)}
              y2={yOf(eac)}
              stroke="currentColor"
              className={COLORS.cost}
              strokeWidth={1.5}
              strokeDasharray="2 3"
            />
            <text x={xOf(periods[periods.length - 1]!) - 4} y={yOf(eac) - 5} textAnchor="end" className="fill-current text-[10px] font-medium text-destructive-600">
              EAC {formatIdrCompact(eac)}
            </text>
          </>
        )}

        {/* Label sumbu X */}
        {periods.map((p) => (
          <text key={p} x={xOf(p)} y={H - 8} textAnchor="middle" className="fill-current text-[10px] tabular-nums text-neutral-500">
            {p.replace(/^\d{2}/, '')}
          </text>
        ))}
      </svg>

      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-caption text-neutral-600">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-px w-4 bg-neutral-400" /> planned
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-px w-4 bg-neutral-900" /> earned
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-px w-4 border-t border-dashed border-destructive-600" /> actual cost
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2 w-4 bg-neutral-900/10" /> schedule variance
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2 w-4 bg-destructive-600/15" /> cost variance
        </span>
      </div>
    </section>
  );
}


