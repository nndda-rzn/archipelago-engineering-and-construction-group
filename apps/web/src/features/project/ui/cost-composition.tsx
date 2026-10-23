import type { CostTypeKey } from '@aec/api-contracts';
import { formatIdr, formatIdrCompact } from '@/shared/lib/format';

/**
 * Zona 3 — komposisi biaya per cost type.
 *
 * Dua pembacaan dalam satu blok, dan keduanya perlu:
 * - bar per baris diskalakan ke nilai TERBESAR, supaya perbedaan antar cost type
 *   terbaca (kalau diskalakan ke total, semuanya tampak kecil dan rata);
 * - satu bar bertumpuk di bawah, supaya porsi terhadap keseluruhan terlihat.
 */
export interface CostCompositionProps {
  composition: Array<{ costType: CostTypeKey; amount: number }>;
}

const LABEL: Record<string, string> = {
  DIRECT: 'Direct',
  LABOR: 'Labor',
  MATERIAL: 'Material',
  SUBCONTRACTOR: 'Subcontractor',
  EQUIPMENT: 'Equipment',
  INDIRECT: 'Indirect',
  OVERHEAD: 'Overhead',
};

/**
 * Ramp netral, bukan warna semantik: cost type bukan status baik/buruk, jadi
 * memakai merah/hijau akan memberi kesan penilaian yang tidak ada. Semua nilai
 * di ramp ini lolos 3:1 terhadap track `neutral-100`.
 */
const FILL: Record<string, string> = {
  LABOR: 'bg-neutral-800',
  MATERIAL: 'bg-neutral-700',
  SUBCONTRACTOR: 'bg-neutral-600',
  EQUIPMENT: 'bg-neutral-500',
  DIRECT: 'bg-neutral-700',
  INDIRECT: 'bg-neutral-600',
  OVERHEAD: 'bg-neutral-500',
};

const FALLBACK = 'bg-neutral-500';

export function CostComposition({ composition }: CostCompositionProps) {
  const rows = composition.filter((c) => c.amount > 0);
  const total = rows.reduce((s, c) => s + c.amount, 0);
  const max = rows.reduce((m, c) => Math.max(m, c.amount), 0);

  return (
    <section aria-label="Cost composition" className="border border-neutral-200 p-4">
      <h2 className="text-h3 text-neutral-900">Composition</h2>
      <p className="mt-0.5 text-caption text-neutral-600">Revised budget by cost type.</p>

      {rows.length === 0 ? (
        <p className="mt-4 text-body-sm text-neutral-500">No budget allocated yet.</p>
      ) : (
        <>
          <ul className="mt-4 space-y-2.5">
            {rows.map((c) => {
              const widthPct = max > 0 ? (c.amount / max) * 100 : 0;
              const sharePct = total > 0 ? (c.amount / total) * 100 : 0;
              return (
                <li key={c.costType} data-testid={`composition-row-${c.costType}`}>
                  <div className="flex items-baseline justify-between gap-3 text-body-sm">
                    <span className="text-neutral-700">{LABEL[c.costType] ?? c.costType}</span>
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono tabular-nums text-neutral-900" title={formatIdr(c.amount)}>
                        {formatIdrCompact(c.amount)}
                      </span>
                      <span className="w-10 text-right font-mono text-caption tabular-nums text-neutral-600">
                        {Math.round(sharePct)}%
                      </span>
                    </span>
                  </div>
                  <span
                    role="img"
                    aria-label={`${LABEL[c.costType] ?? c.costType}: ${formatIdr(c.amount)}, ${Math.round(sharePct)}% of revised`}
                    className="mt-1 block h-2 w-full bg-neutral-100"
                  >
                    <span
                      data-testid={`composition-bar-${c.costType}`}
                      className={`block h-full ${FILL[c.costType] ?? FALLBACK}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>

          <div
            data-testid="composition-total-bar"
            role="img"
            aria-label={rows
              .map((c) => `${LABEL[c.costType] ?? c.costType} ${formatIdr(c.amount)}`)
              .join(', ')}
            className="mt-4 flex h-1.5 w-full overflow-hidden bg-neutral-100"
          >
            {rows.map((c) => (
              <span
                key={c.costType}
                className={`h-full ${FILL[c.costType] ?? FALLBACK}`}
                style={{ width: `${total > 0 ? (c.amount / total) * 100 : 0}%` }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
