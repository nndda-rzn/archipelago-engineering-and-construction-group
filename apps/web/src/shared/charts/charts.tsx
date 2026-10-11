import { useMemo } from 'react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, PolarAngleAxis, PolarGrid,
  PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis,
} from 'recharts';
import { CATEGORICAL_COLORS, CHART, CHART_TOOLTIP_STYLE } from './chart-tokens';

const tooltipStyle = CHART_TOOLTIP_STYLE;
const COMPACT = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
const money = (n: number) => COMPACT.format(n);

/** Warna kategori berulang dari palet aman buta warna. */
export const catColor = (i: number) => CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]!;

export interface Slice { key: string; value: number }

/**
 * Donut (FT: *part-to-whole*) — komposisi proporsional. Legenda di samping
 * membawa label + nilai + %, jadi warna bukan satu-satunya sinyal.
 */
export function Donut({ title, data, format = money }: { title: string; data: Slice[]; format?: (n: number) => string }) {
  const positive = data.filter((d) => d.value > 0);
  const total = positive.reduce((s, d) => s + d.value, 0);
  if (positive.length === 0) {
    return (
      <section aria-label={title} className="flex flex-col gap-2">
        <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
        <p className="text-body-sm text-neutral-400">None recorded.</p>
      </section>
    );
  }
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
        <ResponsiveContainer width={168} height={168} className="shrink-0">
          <PieChart>
            <Pie data={positive} dataKey="value" nameKey="key" innerRadius={48} outerRadius={80} paddingAngle={2} strokeWidth={0}>
              {positive.map((entry, i) => <Cell key={entry.key} fill={catColor(i)} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => format(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
        <ul className="w-full max-w-xs space-y-1.5">
          {positive.map((d, i) => (
            <li key={d.key} className="flex items-center gap-2 text-caption">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: catColor(i) }} aria-hidden="true" />
              <span className="truncate text-neutral-700">{d.key}</span>
              <span className="ml-auto font-mono tabular-nums text-neutral-800">{format(d.value)}</span>
              <span className="w-10 text-right font-mono tabular-nums text-neutral-500">{total > 0 ? `${Math.round((d.value / total) * 100)}%` : '—'}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export interface AreaSeries { period: string; value: number; cumulative?: number }

/**
 * Area trend (FT: *change over time*) — deret waktu ber-sumbu. Garis kumulatif
 * + area bertumpuk, dengan sumbu x (periode) dan y (nilai).
 */
export function AreaTrend({ title, series, valueLabel = 'Value' }: { title: string; series: AreaSeries[]; valueLabel?: string }) {
  if (series.length < 2) {
    return (
      <section aria-label={title} className="flex flex-col gap-2">
        <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
        <p className="text-body-sm text-neutral-400">Not enough periods to chart.</p>
      </section>
    );
  }
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="areaTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.info} stopOpacity={0.3} />
              <stop offset="100%" stopColor={CHART.info} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} tickFormatter={money} width={56} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(Number(v))} cursor={{ fill: CHART.cursor }} />
          <Area type="monotone" dataKey="value" name={valueLabel} stroke={CHART.info} strokeWidth={2} fill="url(#areaTrendFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}

export interface RadarAxis { axis: string; value: number }

/**
 * Radar (FT: *multivariate profile*) — profil multi-dimensi (mis. kesehatan
 * proyek: cost/schedule/risk/quality/HSE). Nilai 0–100 per sumbu.
 */
export function RadarProfile({ title, axes, format = (n: number) => `${Math.round(n)}` }: { title: string; axes: RadarAxis[]; format?: (n: number) => string }) {
  if (axes.length < 3) {
    return (
      <section aria-label={title} className="flex flex-col gap-2">
        <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
        <p className="text-body-sm text-neutral-400">Not enough dimensions.</p>
      </section>
    );
  }
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={axes} outerRadius="72%">
          <PolarGrid stroke={CHART.grid} />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: CHART.axis }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: CHART.axis }} angle={90} />
          <Radar dataKey="value" stroke={CHART.info} fill={CHART.info} fillOpacity={0.28} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => format(Number(v))} />
        </RadarChart>
      </ResponsiveContainer>
    </section>
  );
}

/**
 * Treemap (FT: *part-to-whole*) — komposisi proporsional berkotak. Cocok untuk
 * belanja per vendor atau komposisi biaya. Tiap sel ber-`title`.
 */
export function TreemapChart({ title, data, format = money }: { title: string; data: Slice[]; format?: (n: number) => string }) {
  const positive = data.filter((d) => d.value > 0);
  if (positive.length === 0) {
    return (
      <section aria-label={title} className="flex flex-col gap-2">
        <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
        <p className="text-body-sm text-neutral-400">None recorded.</p>
      </section>
    );
  }
  const data2 = positive.map((d, i) => ({ name: d.key, size: d.value, fill: catColor(i) }));
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <Treemap data={data2} dataKey="size" stroke="#ffffff" aspectRatio={4 / 3}
          content={({ x, y, width, height, name, size, fill }) => (
            <g>
              <rect x={x} y={y} width={width} height={height} style={{ fill: fill as string, stroke: '#fff', strokeWidth: 2 }} />
              {width > 60 && height > 28 && (
                <text x={Number(x) + 6} y={Number(y) + 16} fill="#fff" fontSize={11} fontFamily="IBM Plex Sans, sans-serif">
                  {String(name).slice(0, Math.floor(width / 7))}
                </text>
              )}
              {width > 60 && height > 40 && (
                <text x={Number(x) + 6} y={Number(y) + 30} fill="#ffffffcc" fontSize={10} fontFamily="IBM Plex Mono, monospace">
                  {format(Number(size))}
                </text>
              )}
            </g>
          )}
        >
          {data2.map((d) => <Cell key={d.name} fill={d.fill} />)}
        </Treemap>
      </ResponsiveContainer>
    </section>
  );
}

/**
 * Lollipop (FT: *ranking*) — peringkat: garis + titik, panjang = nilai. Lebih
 * terbaca daripada bar untuk daftar berperingkat.
 */
export function Lollipop({ title, data, format = money }: { title: string; data: Slice[]; format?: (n: number) => string }) {
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
  if (sorted.length === 0) {
    return (
      <section aria-label={title} className="flex flex-col gap-2">
        <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
        <p className="text-body-sm text-neutral-400">None recorded.</p>
      </section>
    );
  }
  const max = Math.max(...sorted.map((d) => d.value));
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
      <ul className="flex flex-col gap-1.5">
        {sorted.map((d, i) => (
          <li key={d.key} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3">
            <span className="truncate text-caption text-neutral-600" title={d.key}>{d.key}</span>
            <span role="img" aria-label={`${d.key}: ${format(d.value)}`} className="relative h-3">
              <span className="absolute inset-y-0 left-0 right-2 overflow-hidden">
                <span className="absolute top-1/2 h-px w-full -translate-y-1/2" style={{ backgroundColor: CHART.grid }} aria-hidden="true" />
                <span className="absolute top-1/2 h-0.5 -translate-y-1/2" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: catColor(i) }} aria-hidden="true" />
                <span className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full" style={{ left: `calc(${(d.value / max) * 100}% - 5px)`, backgroundColor: catColor(i) }} aria-hidden="true" />
              </span>
            </span>
            <span className="text-right font-mono text-caption tabular-nums text-neutral-700">{format(d.value)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Funnel bertahap (FT: *part-to-whole* berurutan) — aliran Contract → Certified
 * → Billed → Collected. Setiap langkah menyempit; lebar = proporsi terhadap
 * langkah pertama.
 */
export function FunnelSteps({ title, steps, format = money }: { title: string; steps: Slice[]; format?: (n: number) => string }) {
  const first = steps[0]?.value ?? 0;
  if (steps.length === 0 || first <= 0) {
    return (
      <section aria-label={title} className="flex flex-col gap-2">
        <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
        <p className="text-body-sm text-neutral-400">No flow data.</p>
      </section>
    );
  }
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
      <div role="img" aria-label={steps.map((s) => `${s.key} ${format(s.value)}`).join(', ')} className="flex min-w-0 flex-col gap-1.5">
        {steps.map((s, i) => {
          // Lebar proporsional; langkah bernilai 0 tidak digambar sebagai bar
          // minimum palsu — hanya jejak kosong dengan angka 0.
          const zero = s.value <= 0;
          const w = zero ? 0 : Math.max(6, (s.value / first) * 100);
          return (
            <div key={s.key} className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3">
              <span className="truncate text-caption text-neutral-600" title={s.key}>{s.key}</span>
              <span className="relative h-6 min-w-0 rounded-sm bg-neutral-100">
                {!zero && (
                  <span
                    data-slot="funnel-bar"
                    className="absolute inset-y-0 left-0 rounded-sm"
                    style={{ width: `${w}%`, backgroundColor: i === 0 ? CHART.strong : i === steps.length - 1 ? CHART.positive : catColor(i) }}
                  />
                )}
              </span>
              <span className={`shrink-0 text-right font-mono text-caption tabular-nums ${zero ? 'text-neutral-400' : 'text-neutral-700'}`} title={format(s.value)}>
                {format(s.value)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Calendar heatmap (FT: *change over time* kepadatan) — kepadatan per hari
 * (mis. daily report). Intensitas satu hue; tiap sel ber-`title`.
 */
export function CalendarHeatmap({ title, days }: { title: string; days: Array<{ date: string; count: number }> }) {
  const { weeks, max, monthLabels } = useMemo(() => {
    const map = new Map(days.map((d) => [d.date.slice(0, 10), d.count]));
    const mx = Math.max(1, ...days.map((d) => d.count));
    const dates = days.map((d) => new Date(d.date)).sort((a, b) => a.getTime() - b.getTime());
    if (dates.length === 0) return { weeks: [], max: 1, monthLabels: [] as Array<{ label: string; col: number }> };
    const first = dates[0]!;
    const start = new Date(first);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // mulai dari Minggu
    const last = dates[dates.length - 1]!;
    const totalDays = Math.ceil((last.getTime() - start.getTime()) / 86_400_000) + 1;
    const wk: Array<Array<{ date: string; count: number } | null>> = [];
    const ml: Array<{ label: string; col: number }> = [];
    let lastMonth = -1;
    for (let i = 0; i < totalDays; i++) {
      const dt = new Date(start.getTime() + i * 86_400_000);
      const iso = dt.toISOString().slice(0, 10);
      const col = Math.floor(i / 7);
      const row = i % 7;
      if (!wk[col]) wk[col] = [null, null, null, null, null, null, null];
      wk[col]![row] = { date: iso, count: map.get(iso) ?? 0 };
      if (dt.getUTCMonth() !== lastMonth && row <= 3) { ml.push({ label: dt.toLocaleDateString('en-GB', { month: 'short' }), col }); lastMonth = dt.getUTCMonth(); }
    }
    return { weeks: wk, max: mx, monthLabels: ml };
  }, [days]);

  if (weeks.length === 0) {
    return (
      <section aria-label={title} className="flex flex-col gap-2">
        <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
        <p className="text-body-sm text-neutral-400">No daily data.</p>
      </section>
    );
  }
  const shade = (c: number) => (c <= 0 ? CHART.cursor : `rgba(37,99,235,${0.15 + 0.75 * (c / max)})`);
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-overline uppercase text-neutral-500">{title}</h3>
      <div className="overflow-x-auto">
        <div className="relative w-max min-w-full pt-4">
          {monthLabels.map((m, i) => (
            <span key={`${m.label}-${i}`} className="absolute top-0 whitespace-nowrap text-caption text-neutral-400" style={{ left: m.col * 12 }}>{m.label}</span>
          ))}
          <div className="flex gap-0.5">
            {weeks.map((week, ci) => (
              <div key={ci} className="flex flex-col gap-0.5">
                {week.map((cell, ri) => (
                  <span key={ri} data-slot="cal-cell" className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: cell ? shade(cell.count) : 'transparent' }} title={cell ? `${cell.date}: ${cell.count}` : undefined} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
