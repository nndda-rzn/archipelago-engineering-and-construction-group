import * as React from 'react';
import { cn } from '../lib/cn';
import { DeltaBadge, type DeltaDirection } from './delta-badge';

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  /** Nilai utama (teks atau node, mis. LiveValue untuk angka yang beranimasi). */
  value: React.ReactNode;
  /** Delta vs periode sebelumnya. */
  delta?: { pct: number | null; direction: DeltaDirection };
  /** Konteks target: persentase pencapaian (0–…). Null = tanpa target. */
  attainmentPct?: number | null;
  /** Teks target, mis. "91% of Rp 20B min". */
  targetLabel?: string;
  /** Apakah nilai memenuhi target. Null = tanpa target. */
  meetsTarget?: boolean | null;
  /** Arah makna: MIN = lantai (naik bagus), MAX = plafon (turun bagus). */
  direction?: 'MIN' | 'MAX' | 'EXACT';
  /** Warna nilai: 'negative' menandai kondisi buruk (mis. overdue). */
  tone?: 'neutral' | 'positive' | 'negative';
  /** Slot visual opsional (mis. sparkline / ring) di samping nilai. */
  viz?: React.ReactNode;
}

const VALUE_TONE: Record<NonNullable<StatTileProps['tone']>, string> = {
  neutral: 'text-neutral-950',
  positive: 'text-success-700',
  negative: 'text-destructive-700',
};

/**
 * Kartu metrik ber-target. Menampilkan label, nilai, delta, dan pencapaian
 * terhadap target (bar + teks). `meetsTarget` mengubah warna bar, bukan warna
 * teks nilai — nilai tetap netral kecuali `tone` diminta.
 */
export function StatTile({
  label,
  value,
  delta,
  attainmentPct,
  targetLabel,
  meetsTarget,
  direction = 'MIN',
  tone = 'neutral',
  viz,
  className,
  ...props
}: StatTileProps) {
  const pct = attainmentPct == null ? null : Math.min(100, Math.max(0, attainmentPct));
  const barTone = meetsTarget === false ? 'bg-warning-700' : meetsTarget === true ? 'bg-success-700' : 'bg-neutral-800';
  const directionLabel = direction === 'MIN' ? 'minimum' : direction === 'MAX' ? 'maximum' : 'target';

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-overline uppercase text-neutral-500">{label}</span>
        {delta && <DeltaBadge pct={delta.pct} direction={delta.direction} />}
      </div>

      <div className="mt-1 flex items-center gap-2.5">
        {viz}
        <span className={cn('font-mono tabular-nums text-metric', VALUE_TONE[tone])}>{value}</span>
      </div>

      <div className="mt-auto pt-2">
        {pct != null && (
          <div
            role="img"
            aria-label={targetLabel ? `${label}: ${targetLabel}` : `${label}: ${pct}% of ${directionLabel}`}
            className="h-1.5 w-full overflow-hidden rounded-sm bg-neutral-100"
          >
            <div data-slot="stat-attainment" className={cn('h-full rounded-sm', barTone)} style={{ width: `${pct}%` }} />
          </div>
        )}
        {targetLabel && <p className="mt-1 text-caption text-neutral-500">{targetLabel}</p>}
      </div>
    </div>
  );
}
