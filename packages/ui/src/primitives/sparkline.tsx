import { cn } from '../lib/cn';

export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  label: string;
  /**
   * Nilai referensi opsional (mis. `0`) yang digambar sebagai garis tipis.
   * Domain skala diperluas agar garis referensi selalu terlihat.
   */
  baseline?: number;
  className?: string;
}

/**
 * Garis tren inline (SVG). Aman terhadap daftar kosong, satu titik, dan nilai
 * yang semuanya sama (tidak membagi nol). Diekspos ke screen reader lewat
 * `role="img"` + `aria-label` berisi rentang nilai.
 */
export function Sparkline({
  values,
  width = 120,
  height = 28,
  stroke = '#dc2626',
  label,
  baseline,
  className,
}: SparklineProps) {
  const dataMin = values.length ? Math.min(...values) : 0;
  const dataMax = values.length ? Math.max(...values) : 0;
  const min = baseline != null ? Math.min(dataMin, baseline) : dataMin;
  const max = baseline != null ? Math.max(dataMax, baseline) : dataMax;
  const span = max - min || 1;

  const yOf = (v: number) => height - ((v - min) / span) * height;

  const points = values
    .map((v, i) => {
      const x = values.length > 1 ? (i / (values.length - 1)) * width : 0;
      return `${x.toFixed(2)},${yOf(v).toFixed(2)}`;
    })
    .join(' ');

  const baselineY = baseline != null ? yOf(baseline) : null;

  return (
    <svg
      role="img"
      aria-label={`${label}: ${dataMin}\u2013${dataMax}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
    >
      {baselineY != null && (
        <line
          data-slot="sparkline-baseline"
          x1={0}
          y1={baselineY}
          x2={width}
          y2={baselineY}
          stroke="#d4d4d8"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}
      {values.length >= 2 && (
        <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      )}
    </svg>
  );
}
