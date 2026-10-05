import { cn } from '../lib/cn';

export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  label: string;
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
  className,
}: SparklineProps) {
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const span = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = values.length > 1 ? (i / (values.length - 1)) * width : 0;
      const y = height - ((v - min) / span) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg
      role="img"
      aria-label={`${label}: ${min}\u2013${max}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
    >
      {values.length >= 2 && (
        <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      )}
    </svg>
  );
}
