import { formatIdr } from '@/shared/lib/format';

export interface CapitalInput {
  contract: number;
  budget: number;
  actual: number;
}

export interface CapitalBar {
  label: string;
  value: number;
  /** Lebar relatif terhadap nilai terbesar (0–100). */
  pct: number;
  /** Warna token netral untuk baris ini. */
  tone: string;
  /** Apakah baris ini melampaui batasnya (actual > budget). */
  overrun: boolean;
}

/**
 * Susun tiga besaran modal (Contract ⊇ Budget ⊇ Actual) sebagai bar sejajar
 * dengan skala bersama, agar panjangnya langsung sebanding. Nilai nol → 0%
 * (tanpa pembagian nol). Warna netral; hanya overrun yang memakai token merah.
 */
export function capitalBars({ contract, budget, actual }: CapitalInput): CapitalBar[] {
  const max = Math.max(contract, budget, actual, 0);
  const pct = (v: number) => (max > 0 ? Math.round((v / max) * 100) : 0);
  const overrun = budget > 0 && actual > budget;
  return [
    { label: 'Contract Value', value: contract, pct: pct(contract), tone: 'bg-neutral-200', overrun: false },
    { label: 'Budget', value: budget, pct: pct(budget), tone: 'bg-neutral-400', overrun: false },
    { label: 'Actual Cost', value: actual, pct: pct(actual), tone: overrun ? 'bg-destructive-500' : 'bg-neutral-800', overrun },
  ];
}

export interface CapitalStructureChartProps extends CapitalInput {
  projectCount: number;
}

/**
 * Bagan "Capital Structure": tiga bar horizontal skala bersama menggantikan
 * grid kartu metrik. Setiap baris = label + bar + angka (rata kanan).
 */
export function CapitalStructureChart({ contract, budget, actual, projectCount }: CapitalStructureChartProps) {
  const bars = capitalBars({ contract, budget, actual });
  const budgetPct = budget > 0 ? Math.round((actual / budget) * 100) : 0;

  return (
    <div data-slot="capital-structure">
      <div className="flex items-baseline justify-between">
        <p className="text-overline uppercase text-neutral-500">Capital structure</p>
        <p className="text-caption text-neutral-500">{projectCount} projects</p>
      </div>
      <dl className="mt-3 space-y-3">
        {bars.map((b) => (
          <div key={b.label} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3">
            <dt className="text-body-sm text-neutral-600">{b.label}</dt>
            <dd className="min-w-0">
              <div
                role="img"
                aria-label={`${b.label}: ${formatIdr(b.value)}`}
                className="h-2.5 w-full overflow-hidden rounded-sm bg-neutral-100"
              >
                <div className={`h-full rounded-sm ${b.tone}`} style={{ width: `${b.pct}%` }} />
              </div>
            </dd>
            <dd className="text-right font-mono text-body-sm tabular-nums text-neutral-900">{formatIdr(b.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-caption text-neutral-500">
        {budget > 0 ? (
          <>
            <span className={bars[2]!.overrun ? 'text-destructive-600' : 'text-neutral-600'}>{budgetPct}% of budget</span>{' '}
            spent · baseline not period-filtered
          </>
        ) : (
          'No budget baseline'
        )}
      </p>
    </div>
  );
}
