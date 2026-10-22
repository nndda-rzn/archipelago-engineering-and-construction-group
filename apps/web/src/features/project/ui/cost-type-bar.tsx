import type { CostTypeKey } from '@aec/api-contracts';

/**
 * Bilah alokasi bertumpuk: satu garis horizontal dibagi menurut cost type, dengan
 * penanda tegak pada posisi serapan biaya.
 *
 * Kenapa begini: setiap proyek menyimpan empat cost type per WBS, dan selama ini
 * keempatnya dijumlahkan menjadi satu angka. Satu bilah mempertemukan dua
 * pertanyaan dalam satu pandangan — "uangnya dialokasikan ke apa" (komposisi) dan
 * "sudah terpakai berapa" (penanda).
 *
 * Warna saja tidak cukup: komposisi juga ditulis sebagai teks di `aria-label`.
 */

const COST_LABEL: Record<string, string> = {
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
 * memakai merah/hijau akan memberi kesan penilaian yang tidak ada.
 */
const COST_CLASS: Record<string, string> = {
  LABOR: 'bg-neutral-700',
  MATERIAL: 'bg-neutral-500',
  SUBCONTRACTOR: 'bg-neutral-400',
  EQUIPMENT: 'bg-neutral-300',
  DIRECT: 'bg-neutral-600',
  INDIRECT: 'bg-neutral-400',
  OVERHEAD: 'bg-neutral-300',
};

const FALLBACK_CLASS = 'bg-neutral-200';

export interface CostTypeBarProps {
  byCostType: Partial<Record<CostTypeKey, number>>;
  total: number;
  /** Serapan biaya dalam persen. Boleh > 100. `null` bila belum ada budget. */
  usedPercent: number | null;
}

export function CostTypeBar({ byCostType, total, usedPercent }: CostTypeBarProps) {
  const entries = (Object.entries(byCostType) as Array<[string, number]>)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b[1] - a[1]);

  const hasBudget = total > 0 && entries.length > 0;

  if (!hasBudget) {
    return (
      <span
        data-testid="cost-track"
        role="img"
        aria-label="No budget"
        className="block h-2 w-full rounded-sm bg-neutral-100"
      />
    );
  }

  const label = entries
    .map(([key, value]) => `${COST_LABEL[key] ?? key} ${Math.round((value / total) * 100)}%`)
    .join(', ');
  const usedLabel = usedPercent == null ? '' : `, ${Math.round(usedPercent)}% used`;

  let cumulative = 0;
  const segments = entries.map(([key, value]) => {
    const pct = (value / total) * 100;
    const left = cumulative;
    cumulative += pct;
    return { key, left, pct };
  });

  // Penanda serapan dijepit ke 0-100 supaya tidak keluar dari trek, tetapi angka
  // di `aria-label` tetap nilai aslinya (150% tetap terbaca 150%).
  const markerPct = usedPercent == null ? null : Math.min(100, Math.max(0, usedPercent));

  return (
    <span
      data-testid="cost-track"
      role="img"
      aria-label={`${label}${usedLabel}`}
      className="relative block h-2 w-full overflow-hidden rounded-sm bg-neutral-100"
    >
      {segments.map((s) => (
        <span
          key={s.key}
          data-testid="cost-segment"
          className={`absolute inset-y-0 ${COST_CLASS[s.key] ?? FALLBACK_CLASS}`}
          style={{ left: `${s.left}%`, width: `${s.pct}%` }}
        />
      ))}
      {markerPct != null && (
        <span
          data-testid="cost-used-marker"
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 bg-neutral-950"
          style={{ left: `calc(${markerPct}% - 1px)` }}
        />
      )}
    </span>
  );
}
