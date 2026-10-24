import type { ControlAccount } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';

/**
 * Zona D — sumber drift, per control account.
 *
 * AACE RP 60R-10: "the control account integrates all the project control plan
 * components (i.e., cost, schedule, resources, risk, and procurement)". Karena
 * itu CA bukan daftar pasif — tiap CA membawa progresnya sendiri, dan CA yang
 * belum punya planned value ditandai sebagai masalah data, bukan nol.
 *
 * Progres digambar sebagai bilah, bukan hanya angka: pada grid 4 kolom, panjang
 * bilah membuat "di mana pekerjaan benar-benar berjalan" terbaca sebelum angka
 * dibaca.
 */
export interface ControlsAccountsProps {
  accounts: ControlAccount[];
}

export function ControlsAccounts({ accounts }: ControlsAccountsProps) {
  if (accounts.length === 0) {
    return (
      <section aria-label="Control accounts" className="border-t border-neutral-300">
        <p className="mb-2 mt-2 font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ SUMBER DRIFT ]</p>
        <p className="text-body-sm text-neutral-600">No control accounts for this project yet.</p>
      </section>
    );
  }

  const issues = accounts.filter((a) => a.dataIssue).length;

  return (
    <section aria-label="Control accounts" className="border-t border-neutral-300">
      <div className="mb-2 mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ SUMBER DRIFT ]</p>
        <p className="text-caption text-neutral-500">
          <span className="font-mono tabular-nums text-neutral-700">{accounts.length}</span> control accounts
          {issues > 0 && (
            <>
              {' · '}
              <span className="text-destructive-600">{issues} without planned value</span>
            </>
          )}
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        {accounts.map((a) => {
          // EV per CA: porsi anggaran yang sudah earned. AC tidak berdimensi CA,
          // jadi yang bisa dihitung jujur hanya sisi earned-nya.
          const earnedShare = (Number(a.progressPercent) / 100) * Number(a.budgetAmount);
          const pct = Math.max(0, Math.min(100, Number(a.progressPercent)));

          return (
            <li key={a.id} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-caption uppercase tracking-wide text-neutral-500">
                  {a.code.replace(/^CA-\d+-/, '')}
                </span>
                <span className="font-mono text-body-sm tabular-nums text-neutral-950">{Number(a.progressPercent)}%</span>
              </div>

              <p className="mt-0.5 truncate text-body-sm text-neutral-900" title={a.name}>
                {a.name}
              </p>

              {/* Bilah progres: terisi = progres; warna status hanya bila data bermasalah. */}
              <span className="mt-1 block h-1 w-full bg-neutral-200" aria-hidden="true">
                <span
                  className={`block h-full ${a.dataIssue ? 'bg-destructive-600' : 'bg-neutral-800'}`}
                  style={{ width: `${pct}%` }}
                />
              </span>

              <p className="mt-1 font-mono text-caption tabular-nums text-neutral-600">
                {a.dataIssue ? (
                  <span className="text-destructive-600">planned value missing</span>
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
