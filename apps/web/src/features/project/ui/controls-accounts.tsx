import type { ControlAccount } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';

/**
 * Zona D — sumber drift, per control account.
 *
 * AACE RP 60R-10: "the control account integrates all the project control plan
 * components (i.e., cost, schedule, resources, risk, and procurement)". Karena
 * itu CA bukan daftar pasif — tiap CA membawa indeksnya sendiri, dan CA yang
 * belum punya planned value ditandai sebagai masalah data, bukan nol.
 */
export interface ControlsAccountsProps {
  accounts: ControlAccount[];
}

export function ControlsAccounts({ accounts }: ControlsAccountsProps) {
  if (accounts.length === 0) {
    return (
      <section aria-label="Control accounts" className="border-t border-neutral-200 pt-3">
        <p className="text-caption uppercase tracking-wide text-neutral-900/40">Control accounts</p>
        <p className="mt-1.5 text-body-sm text-neutral-900/70">Belum ada control account untuk proyek ini.</p>
      </section>
    );
  }

  const issues = accounts.filter((a) => a.dataIssue).length;

  return (
    <section aria-label="Control accounts" className="border-t border-neutral-200 pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-caption uppercase tracking-wide text-neutral-900/40">Control accounts</p>
        {issues > 0 && (
          <p className="text-caption text-neutral-900/70">
            <span className="mr-1 text-racing-red-700" aria-hidden="true">⚠</span>
            {issues} dari {accounts.length} punya progres tanpa planned value — SPI tidak dapat dihitung
          </p>
        )}
      </div>

      <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
        {accounts.map((a) => {
          // CPI per CA: EV = budget × progres; AC tidak berdimensi CA, jadi
          // yang bisa dihitung jujur adalah porsi anggaran yang sudah "earned".
          const earnedShare = (Number(a.progressPercent) / 100) * Number(a.budgetAmount);
          return (
            <li key={a.id} className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  aria-hidden="true"
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${a.dataIssue ? 'border border-racing-red-600 bg-white' : 'bg-neutral-900'}`}
                />
                <span className="font-mono text-caption text-neutral-900/40">{a.code.replace(/^CA-\d+-/, '')}</span>
                <span className="ml-auto font-mono text-caption tabular-nums text-neutral-900">
                  {Number(a.progressPercent)}%
                </span>
              </div>
              <p className="mt-0.5 truncate text-body-sm text-neutral-900" title={a.name}>
                {a.name}
              </p>
              <p className="font-mono text-caption tabular-nums text-neutral-900/70">
                {a.dataIssue ? (
                  <span className="text-racing-red-700">PV belum diisi ⚠</span>
                ) : (
                  <>
                    PV {formatIdrCompact(Number(a.plannedValue))} · earned {formatIdrCompact(earnedShare)}
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
