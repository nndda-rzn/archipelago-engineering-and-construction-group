import * as React from 'react';
import { Legend, ReferenceArea, ReferenceLine, Tooltip } from 'recharts';
import { formatIdr } from '@/shared/lib/format';

/**
 * Gaya tooltip bersama untuk semua chart dashboard. Satu sumber agar tooltip
 * tidak lagi berbeda-beda antar chart (sebelumnya tiap file mendefinisikan
 * `tooltipStyle` sendiri).
 */
export const CHART_TOOLTIP_STYLE = {
  borderRadius: 6,
  border: '1px solid #e4e4e7',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
} as const;

export interface AnnotatedChartProps {
  /** Nilai garis target (opsional). */
  target?: number;
  /** Label target, mis. "Target Rp 500M". */
  targetLabel?: string;
  /** Band rentang untuk menyorot area (mis. periode forecast). */
  band?: { x1: string | number; x2: string | number; label?: string };
  /** Garis referensi di nol untuk chart bertanda (cash in/out, net). */
  zeroLine?: boolean;
  /** Tampilkan legend (wajib bila seri > 1). */
  showLegend?: boolean;
  /** Posisi legend; default `bottom`. `top` menghemat tinggi bawah. */
  legendPosition?: 'top' | 'bottom';
  /** Pemformat nilai tooltip; default formatIdr. */
  formatValue?: (value: number) => string;
  /** Nama seri untuk tooltip, keyed by dataKey. */
  seriesNames?: Record<string, string>;
  /** Slot konten chart (XAxis/YAxis/seri) sebagai children. */
  children: React.ReactNode;
}

/**
 * Pembungkus anotasi chart: menambahkan garis target, band rentang, garis nol,
 * dan legend/tooltip bersama. Chart tanpa acuan (target/rentang) adalah chart
 * "tutorial"; pembungkus ini memastikan setiap chart dashboard punya konteks.
 *
 * Dipakai **di dalam** `<XxxChart>` recharts, jadi komponen ini hanya merender
 * elemen-elemen anak recharts — bukan pembungkus DOM.
 */
export function AnnotatedChart({
  target,
  targetLabel,
  band,
  zeroLine,
  showLegend,
  legendPosition = 'bottom',
  formatValue = formatIdr,
  seriesNames,
  children,
}: AnnotatedChartProps) {
  return (
    <>
      {band && (
        <ReferenceArea
          x1={band.x1}
          x2={band.x2}
          fill="#a1a1aa"
          fillOpacity={0.1}
          label={band.label ? { value: band.label, fontSize: 9, fill: '#a1a1aa', position: 'insideTop' } : undefined}
        />
      )}
      {zeroLine && <ReferenceLine y={0} stroke="#d4d4d8" />}
      {target != null && (
        <ReferenceLine
          y={target}
          stroke="#18181b"
          strokeWidth={1}
          strokeDasharray="5 4"
          strokeOpacity={0.5}
          label={targetLabel ? { value: targetLabel, fontSize: 9, fill: '#52525b', position: 'insideTopRight' } : undefined}
        />
      )}
      {children}
      {showLegend && (
        <Legend
          formatter={(value) => seriesNames?.[value] ?? value}
          verticalAlign={legendPosition}
          wrapperStyle={{ fontSize: 12 }}
        />
      )}
      <Tooltip
        contentStyle={CHART_TOOLTIP_STYLE}
        cursor={{ fill: '#f4f4f5' }}
        formatter={(value, name) => [formatValue(Number(value)), seriesNames?.[String(name)] ?? name]}
      />
    </>
  );
}
