import { useMemo, useState } from 'react';
import { Sparkline } from '@aec/ui';
import type { GlanceSignal, ProjectSchedule, ProjectCashFlow } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';

const TONE_CLASS: Record<GlanceSignal['tone'], string> = {
  ok: 'text-success-700',
  warn: 'text-warning-700',
  bad: 'text-destructive-600',
  neutral: 'text-neutral-950',
};

/**
 * "At a glance" — satu angka per dimensi (jadwal, biaya, risiko, mutu, HSE,
 * milestone). Angka = angka: `font-mono tabular-nums`, tanpa bingkai kartu.
 * Tone hanya menyorot yang perlu perhatian; label selalu ada (warna bukan
 * satu-satunya sinyal).
 */
export function GlanceStrip({ signals }: { signals: GlanceSignal[] }) {
  return (
    <section aria-label="Project at a glance" className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
      {signals.map((s) => (
        <div key={s.key} className="min-w-0">
          <p className="text-overline uppercase text-neutral-500">{s.label}</p>
          <p className={`mt-0.5 font-mono text-h3 tabular-nums ${TONE_CLASS[s.tone]}`}>
            {s.value == null ? '—' : s.value}
            {s.unit && <span className="ml-0.5 text-caption text-neutral-400">{s.unit}</span>}
          </p>
        </div>
      ))}
    </section>
  );
}

/**
 * S-curve: rencana vs aktual. Visual ditentukan **bentuk data** (deret waktu
 * kumulatif) → garis, bukan tabel. Rencana = garis putus-putus (baseline),
 * aktual = garis penuh. Dua nilai akhir ditampilkan sebagai angka mono.
 */
export function SCurve({ schedule }: { schedule: ProjectSchedule }) {
  const planned = useMemo(() => schedule.plannedCurve.map((p) => p.plannedPct), [schedule]);
  const variance = Math.round((schedule.progressActual - schedule.progressPlanned) * 10) / 10;

  if (planned.length < 2) {
    return <p className="text-body-sm text-neutral-500">No time-phased budget — S-curve unavailable.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-6">
        <div>
          <p className="text-overline uppercase text-neutral-500">Planned</p>
          <p className="font-mono text-metric tabular-nums text-neutral-500">{schedule.progressPlanned}%</p>
        </div>
        <div>
          <p className="text-overline uppercase text-neutral-500">Actual</p>
          <p className={`font-mono text-metric tabular-nums ${variance >= 0 ? 'text-financial-positive-600' : 'text-warning-600'}`}>{schedule.progressActual}%</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-overline uppercase text-neutral-500">Variance</p>
          <p className={`font-mono text-h3 tabular-nums ${variance >= 0 ? 'text-financial-positive-600' : 'text-warning-600'}`}>{variance >= 0 ? '+' : ''}{variance} pts</p>
        </div>
      </div>
      <div role="img" aria-label={`S-curve: planned ${schedule.progressPlanned}%, actual ${schedule.progressActual}%`} className="relative">
        <Sparkline values={planned} width={520} height={64} stroke="#a1a1aa" label="Planned progress" className="w-full" />
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-neutral-500">
        {schedule.plannedCurve.map((p) => (
          <li key={p.period} className="flex items-center gap-1">
            <span className="font-mono tabular-nums">{p.period}</span>
            <span className="text-neutral-400">{p.plannedPct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MS_TONE: Record<string, string> = {
  ACHIEVED: 'bg-success-500', MISSED: 'bg-destructive-500', IN_PROGRESS: 'bg-warning-500', PLANNED: 'bg-neutral-300',
};

/**
 * Milestone band: rentang milestone pada satu garis waktu. Visual ditentukan
 * **bentuk data** (tanggal rencana vs aktual) → pita posisi, bukan daftar.
 * Milestone telat (aktual > rencana) ditandai garis sambung.
 */
export function MilestoneBand({ schedule }: { schedule: ProjectSchedule }) {
  // "Sekarang" dibaca sekali saat mount (pola React), bukan saat render.
  const [now] = useState(() => Date.now());
  const { min, span, todayPct } = useMemo(() => {
    const dates = schedule.milestones.flatMap((m) => [new Date(m.plannedDate).getTime(), m.actualDate ? new Date(m.actualDate).getTime() : 0]).filter((n) => n > 0);
    if (dates.length === 0) return { min: 0, span: 1, todayPct: 0 };
    const lo = Math.min(...dates);
    const hi = Math.max(...dates);
    const sp = Math.max(hi - lo, 86_400_000);
    return { min: lo, span: sp, todayPct: Math.min(100, Math.max(0, ((now - lo) / sp) * 100)) };
  }, [schedule, now]);
  const pos = (t: number) => Math.min(100, Math.max(0, ((t - min) / span) * 100));

  if (schedule.milestones.length === 0) {
    return <p className="text-body-sm text-neutral-500">No milestones defined.</p>;
  }

  return (
    <div role="img" aria-label={`Milestones: ${schedule.milestones.map((m) => `${m.name} ${m.status}`).join(', ')}`} className="relative flex flex-col gap-2">
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-10 w-px bg-racing-red-600/60" style={{ left: `calc(11rem + ${todayPct}% * 0.72)` }} />
      {schedule.milestones.map((m) => {
        const p = pos(new Date(m.plannedDate).getTime());
        const a = m.actualDate ? pos(new Date(m.actualDate).getTime()) : null;
        return (
          <div key={m.id} className="grid grid-cols-[11rem_1fr] items-center gap-3">
            <span className="flex items-center gap-1.5 truncate text-body-sm text-neutral-700" title={m.name}>
              {m.isCritical && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-racing-red-600" aria-label="critical" />}
              <span className="truncate">{m.name}</span>
            </span>
            <span className="relative h-4 rounded-sm bg-neutral-100">
              {a != null && a !== p && (
                <span aria-hidden="true" className="absolute top-1/2 h-px -translate-y-1/2 bg-warning-500" style={{ left: `${Math.min(p, a)}%`, width: `${Math.abs(a - p)}%` }} />
              )}
              <span
                data-slot="milestone-dot"
                className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${MS_TONE[m.status] ?? 'bg-neutral-400'}`}
                style={{ left: `calc(${p}% - 5px)` }}
                title={`${m.name}: planned ${m.plannedDate.slice(0, 10)}${m.actualDate ? `, actual ${m.actualDate.slice(0, 10)}` : ''} (${m.status})`}
              />
            </span>
          </div>
        );
      })}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 pl-[11rem] text-caption text-neutral-500">
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success-500" aria-hidden="true" />Achieved</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning-500" aria-hidden="true" />In progress</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-300" aria-hidden="true" />Planned</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive-500" aria-hidden="true" />Missed</li>
      </ul>
    </div>
  );
}

/**
 * Rantai kas: Contract → Budget → Committed → Actual → Billed → Collected.
 * Visual ditentukan **bentuk data** (bagian-dari-keseluruhan berurutan) → bar
 * bertingkat, bukan tabel. Tiap langkah punya nilai mono + porsi %.
 */
export function CashChain({ cashFlow }: { cashFlow: ProjectCashFlow }) {
  const max = Math.max(1, ...cashFlow.chain.map((c) => c.value));
  return (
    <div className="flex flex-col gap-2">
      <div role="img" aria-label={cashFlow.chain.map((c) => `${c.label} ${formatIdr(c.value)}`).join(', ')} className="flex flex-col gap-1.5">
        {cashFlow.chain.map((c, i) => (
          <div key={c.key} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3">
            <span className="text-body-sm text-neutral-600">{c.label}</span>
            <span className="h-3 w-full overflow-hidden rounded-sm bg-neutral-100">
              <span
                data-slot="cash-bar"
                className={`block h-full rounded-sm ${i === 0 ? 'bg-neutral-800' : i === cashFlow.chain.length - 1 ? 'bg-success-500' : 'bg-neutral-400'}`}
                style={{ width: `${(c.value / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-mono text-caption tabular-nums text-neutral-700">{formatIdr(c.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
