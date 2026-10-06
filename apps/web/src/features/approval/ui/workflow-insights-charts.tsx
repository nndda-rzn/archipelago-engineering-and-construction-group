import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WorkflowInsights } from '@aec/api-contracts';
import { formatNumber } from '@/shared/lib/format';
import { CHART } from '@/widgets/dashboard-charts/chart-colors';

/**
 * Chart untuk insight rantai approval.
 *
 * Setiap bentuk dipilih dari **hubungan datanya**, bukan dari keinginan
 * menampilkan chart:
 * - volume bulanan = deret waktu → **garis/area**, bukan batang;
 * - cakupan approver = satu nilai tunggal → **ring + angka**, bukan daftar;
 * - sebaran nominal + ambang = distribusi → **histogram dengan garis ambang**.
 *
 * Semua warna diimpor dari `chart-colors` (nol hex di sini), setiap chart punya
 * `aria-label` deskriptif, dan masing-masing menyediakan padanan tabel lewat
 * komponen pemanggil.
 */

const tooltipStyle = {
  borderRadius: 6,
  border: `1px solid ${CHART.grid}`,
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
};

/**
 * Volume bulanan: dibuat vs diputuskan.
 *
 * Dua seri waktu pada satu sumbu Y (keduanya "jumlah dokumen", satuan sama) —
 * bukan dual-axis, yang menyesatkan. Satu bulan saja tidak digambar sebagai
 * chart (satu titik data bukan tren).
 */
export function MonthlyVolumeChart({ monthly }: { monthly: WorkflowInsights['monthly'] }) {
  if (monthly.length < 2) return null;
  return (
    <figure className="m-0">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="wfCreatedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.axis} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART.axis} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: CHART.cursor }} />
          <Area
            type="monotone"
            dataKey="created"
            name="Submitted"
            stroke={CHART.axis}
            strokeWidth={2}
            fill="url(#wfCreatedFill)"
            dot={false}
          />
          <Line type="monotone" dataKey="decided" name="Decided" stroke="#27272a" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-neutral-500">
        <LegendItem className="bg-neutral-500">Submitted</LegendItem>
        <LegendItem className="bg-neutral-800">Decided</LegendItem>
      </figcaption>
    </figure>
  );
}

/**
 * Cakupan approver sebagai satu angka: berapa persen langkah punya pemegang.
 *
 * Satu nilai tidak layak dijadikan chart penuh — ia angka besar dengan ring
 * sebagai penguat, bukan grafik. Warna mengikuti token; langkah tanpa pemegang
 * tetap membawa teks dan daftar, jadi warna bukan satu-satunya sinyal.
 */
export function CoverageRing({
  total,
  covered,
  uncovered,
}: {
  total: number;
  covered: number;
  uncovered: number;
}) {
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  const stroke = uncovered > 0 ? '#dc2626' : '#27272a'; // destructive-600 | neutral-800
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[88px] w-[88px] shrink-0">
        <svg
          viewBox="0 0 88 88"
          className="h-[88px] w-[88px] -rotate-90"
          role="img"
          aria-label={`${covered} of ${total} steps have at least one approver (${pct} percent)`}
        >
          <circle cx="44" cy="44" r={radius} fill="none" stroke="#e4e4e7" strokeWidth="8" />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-h2 tabular-nums text-neutral-900">
          {pct}%
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-body-sm text-neutral-700">
          <span className="font-mono tabular-nums">{covered}</span> of{' '}
          <span className="font-mono tabular-nums">{total}</span> step{total === 1 ? '' : 's'} have an approver
        </p>
        {uncovered > 0 ? (
          <p className="mt-0.5 text-body-sm text-destructive-700">
            <span className="font-mono tabular-nums">{uncovered}</span> step{uncovered === 1 ? '' : 's'} would stall the chain
          </p>
        ) : (
          <p className="mt-0.5 text-body-sm text-neutral-500">Every step can be actioned.</p>
        )}
      </div>
    </div>
  );
}

/**
 * Sebaran nominal dokumen dengan ambang nyata tiap langkah sebagai garis.
 *
 * Rentang bucket membentang beberapa orde besaran (10 juta → 10 miliar), jadi
 * sumbu-X memakai skala **logaritmik**. Skala linear akan menumpuk hampir semua
 * dokumen di ujung kiri dan menyembunyikan sebarannya. Garis ambang berasal dari
 * syarat langkah yang sebenarnya, bukan angka yang dikarang.
 */
export function AmountThresholdChart({ insights }: { insights: WorkflowInsights }) {
  const { amounts, thresholds } = insights;
  if (amounts.count === 0) return null;

  const positives = amounts.buckets.filter((b) => b.count > 0 && b.to !== null);
  const maxUpper = Math.max(amounts.max ?? 0, ...thresholds.map((t) => t.value), 10_000_000);
  const domainMax = 10 ** Math.ceil(Math.log10(maxUpper * 1.2));
  const logMin = 0; // 1 rupiah sebagai batas kiri praktis
  const logMax = Math.log10(domainMax);
  const xOf = (value: number) => {
    const v = Math.max(1, value);
    return ((Math.log10(v) - logMin) / (logMax - logMin)) * 100;
  };

  const maxCount = Math.max(...amounts.buckets.map((b) => b.count), 1);

  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={
          `Document value distribution, ${amounts.count} documents from ${formatNumber(amounts.min ?? 0)} ` +
          `to ${formatNumber(amounts.max ?? 0)}. ` +
          amounts.buckets.map((b) => `${b.label}: ${b.count}`).join(', ') +
          (thresholds.length
            ? `. Approval thresholds: ${thresholds.map((t) => `step ${t.stepOrder} above ${formatNumber(t.value)}`).join(', ')}.`
            : '.')
        }
        className="relative h-[140px] w-full"
      >
        {/* Sumbu dasar */}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-6 h-px bg-neutral-200" />

        {/* Batang histogram per bucket, diposisikan pada skala log */}
        {amounts.buckets.map((b) => {
          if (b.count === 0) return null;
          const left = xOf(b.from === 0 ? 1 : b.from);
          const right = b.to === null ? 100 : xOf(b.to);
          const width = Math.max(right - left - 0.8, 0.8);
          const height = Math.max(4, (b.count / maxCount) * 72);
          return (
            <span
              key={b.label}
              data-slot="amount-bar"
              className="absolute bottom-6 rounded-sm bg-neutral-800"
              style={{ left: `${left}%`, width: `${width}%`, height: `${height}px` }}
            />
          );
        })}

        {/* Garis ambang nyata tiap langkah */}
        {thresholds.map((t) => (
          <span
            key={`${t.stepOrder}-${t.field}`}
            data-slot="threshold-line"
            className="absolute bottom-6 top-2 border-l border-dashed border-neutral-500"
            style={{ left: `${xOf(t.value)}%` }}
          >
            <span className="absolute -top-1 left-1 whitespace-nowrap font-mono text-caption tabular-nums text-neutral-600">
              ≥ {formatNumber(t.value)}
            </span>
          </span>
        ))}

        {/* Label sumbu: batas kiri/kanan skala log */}
        <span aria-hidden="true" className="absolute bottom-0 left-0 font-mono text-caption text-neutral-500">
          1
        </span>
        <span aria-hidden="true" className="absolute bottom-0 right-0 font-mono text-caption text-neutral-500">
          {formatNumber(domainMax)}
        </span>
      </div>
      <figcaption className="mt-2 text-caption text-neutral-500">
        {amounts.count} document{amounts.count === 1 ? '' : 's'} on a logarithmic scale
        {positives.length > 0 ? '' : ''}; dashed lines are the approval thresholds.
      </figcaption>
    </figure>
  );
}

function LegendItem({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={className + ' h-2 w-2 rounded-sm'} aria-hidden="true" />
      {children}
    </span>
  );
}
