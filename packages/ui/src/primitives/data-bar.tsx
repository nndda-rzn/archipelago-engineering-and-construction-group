import { cn } from '../lib/cn';

/** Warna isi bar. `brand` = default lama (racing-red) agar pemanggil eksisting tidak berubah. */
export type BarTone = 'brand' | 'neutral' | 'warning' | 'destructive' | 'success';

const TONE_FILL: Record<BarTone, string> = {
  brand: 'bg-racing-red-600',
  neutral: 'bg-neutral-400',
  warning: 'bg-warning-500',
  destructive: 'bg-destructive-600',
  success: 'bg-success-500',
};

export interface BulletBarProps {
  value: number;
  max: number;
  label: string;
  /** Warna isi. Default `brand` (racing-red) untuk kompatibilitas pemakaian lama. */
  tone?: BarTone;
  className?: string;
}

export function BulletBar({ value, max, label, tone = 'brand', className }: BulletBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div
      role="img"
      aria-label={`${label}: ${pct}%`}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-neutral-100', className)}
    >
      <div data-slot="bullet-fill" className={cn('h-full rounded-full', TONE_FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export interface MiniStackedBarProps {
  primary: number;
  secondary: number;
  label: string;
  className?: string;
}

export function MiniStackedBar({ primary, secondary, label, className }: MiniStackedBarProps) {
  const total = primary + secondary;
  const primaryPct = total > 0 ? (primary / total) * 100 : 0;
  return (
    <div
      role="img"
      aria-label={`${label}: ${primary} / ${secondary}`}
      className={cn('flex h-2 w-full overflow-hidden rounded-full bg-neutral-100', className)}
    >
      <div className="h-full bg-racing-red-600" style={{ width: `${primaryPct}%` }} />
      <div className="h-full bg-neutral-300" style={{ width: `${100 - primaryPct}%` }} />
    </div>
  );
}

/** Nada gradient untuk `ScaleBar` — mengikuti tanda nilai (kontribusi + / −). */
export type ScaleTone = 'positive' | 'negative' | 'neutral';

/**
 * Gradient CSS per nada. **Gradient = skala**: bar mengisi sebagian track yang
 * bergradasi, sehingga ujung bar menunjukkan posisi nilai pada skala. Hue tetap
 * mengikuti tanda (hijau menambah / merah mengurangi) agar warna tidak jadi
 * dekorasi murni — panjang bar = besaran, warna = arah kontribusi.
 */
const SCALE_GRADIENT: Record<ScaleTone, string> = {
  positive: 'linear-gradient(90deg, var(--success-700) 0%, var(--success-400) 100%)',
  negative: 'linear-gradient(90deg, var(--destructive-700) 0%, var(--destructive-400) 100%)',
  neutral: 'linear-gradient(90deg, var(--neutral-700) 0%, var(--neutral-400) 100%)',
};

export interface ScaleBarProps {
  value: number;
  max: number;
  label: string;
  /** Nada mengikuti tanda nilai. Default `neutral`. */
  tone?: ScaleTone;
  className?: string;
}

/**
 * Bar berisi gradient dengan panjang = `value / max` terhadap skala. Dipakai untuk
 * kontribusi/dekomposisi: panjang menunjukkan besaran, gradient menunjukkan posisi
 * pada skala, dan nada menunjukkan arah (positif/negatif).
 */
export function ScaleBar({ value, max, label, tone = 'neutral', className }: ScaleBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div
      role="img"
      aria-label={`${label}: ${pct}%`}
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-neutral-100', className)}
    >
      <div
        data-slot="scale-fill"
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: SCALE_GRADIENT[tone] }}
      />
    </div>
  );
}
