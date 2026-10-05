import { formatIdr } from '@/shared/lib/format';

/** Persentase serapan anggaran, dijaga agar tidak membagi nol dan tidak melebihi 100. */
export function bulletWidth(actual: number, budget: number): number {
  return budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0;
}

export interface BudgetBulletProps {
  actual: number;
  budget: number;
  target?: number;
}

/**
 * Bullet graph `actual / budget` dengan penanda target opsional.
 * Aksesibel via `role="img"` + aria-label berisi persentase serapan.
 */
export function BudgetBullet({ actual, budget, target }: BudgetBulletProps) {
  const pct = bulletWidth(actual, budget);
  const targetPct = target != null && budget > 0 ? Math.min(100, Math.round((target / budget) * 100)) : null;

  return (
    <div className="py-1">
      <div role="img" aria-label={`Budget burn: ${pct}%`} className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-racing-red-600" style={{ width: `${pct}%` }} />
        {targetPct != null && (
          <span
            data-slot="bullet-target"
            aria-hidden="true"
            className="absolute top-0 h-full w-0.5 bg-neutral-800"
            style={{ left: `${targetPct}%` }}
          />
        )}
      </div>
      <p className="mt-2 text-caption text-neutral-500">
        {formatIdr(actual)} of {formatIdr(budget)} baseline
      </p>
    </div>
  );
}
