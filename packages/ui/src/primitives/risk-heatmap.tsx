import * as React from 'react';
import { cn } from '../lib/cn';

export interface RiskCell {
  likelihood: number;
  impact: number;
  count: number;
}

export interface RiskHeatmapProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Sel terisi: likelihood (1-5) × impact (1-5) → count. Sel kosong tidak perlu dikirim. */
  cells: RiskCell[];
}

/** Ramp satu hue (warning) — intensitas = besaran, bukan kategori. Merah tidak dipakai. */
const RAMP = ['bg-neutral-100', 'bg-warning-100', 'bg-warning-300', 'bg-warning-500', 'bg-warning-700'];

/**
 * Heatmap risiko 5×5 (likelihood × impact). Intensitas warna mewakili jumlah
 * risiko di sel itu; setiap sel terisi juga membawa `title` "L×I = count" agar
 * makna tidak bergantung pada warna saja (WCAG 1.4.1). Aksesibel lewat
 * `role="img"` + aria-label yang menyebut tiap sel terisi.
 */
export function RiskHeatmap({ cells, className, ...props }: RiskHeatmapProps) {
  const byKey = new Map(cells.map((c) => [`${c.likelihood}:${c.impact}`, c.count]));
  const max = Math.max(1, ...cells.map((c) => c.count));
  const filled = cells.filter((c) => c.count > 0);
  const label =
    filled.length === 0
      ? 'Risk matrix: no open risks'
      : `Risk matrix: ${filled.map((c) => `${c.likelihood}×${c.impact} = ${c.count}`).join(', ')}`;

  const rampIndex = (count: number) => (count <= 0 ? 0 : Math.min(RAMP.length - 1, Math.ceil((count / max) * (RAMP.length - 1))));

  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      <div role="img" aria-label={label} className="grid grid-cols-5 gap-0.5">
        {/* Baris = likelihood menurun (5 di atas), kolom = impact menaik (1→5). */}
        {[5, 4, 3, 2, 1].map((l) =>
          [1, 2, 3, 4, 5].map((i) => {
            const count = byKey.get(`${l}:${i}`) ?? 0;
            return (
              <span
                key={`${l}-${i}`}
                data-slot="risk-cell"
                data-likelihood={l}
                data-impact={i}
                data-count={count}
                title={count > 0 ? `${l}×${i} = ${count}` : undefined}
                className={cn('block h-4 w-full rounded-sm', RAMP[rampIndex(count)])}
              />
            );
          }),
        )}
      </div>
      <div className="flex justify-between text-caption text-neutral-500">
        <span aria-hidden="true">impact →</span>
        <span className="font-mono tabular-nums">{filled.reduce((s, c) => s + c.count, 0)} open</span>
      </div>
    </div>
  );
}
