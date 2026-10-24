/**
 * Zona E — integritas data.
 *
 * Ini bukan catatan kaki. Ketika control account belum punya planned value, SPI
 * tidak dapat dihitung dan zona trajektori kehilangan separuh isinya. Fakta itu
 * mengubah cara membaca seluruh halaman, jadi ia berdiri sebagai zona sendiri:
 * angka besar `n / m` lebih jujur daripada satu kalimat abu-abu di bawah tabel.
 *
 * Zona ini sengaja tidak menyembunyikan apa pun: selama `n > 0`, pembaca tahu
 * indeks di atasnya dihitung dari data yang belum lengkap.
 */
export interface ControlsIntegrityProps {
  issueCount: number;
  total: number;
}

export function ControlsIntegrity({ issueCount, total }: ControlsIntegrityProps) {
  const complete = total > 0 && issueCount === 0;

  return (
    <section aria-label="Data integrity" className="border-t border-neutral-300">
      <p className="mb-2 mt-2 font-mono text-overline uppercase tracking-[0.12em] text-neutral-500">[ INTEGRITAS DATA ]</p>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="font-mono text-metric tabular-nums">
          <span className={complete ? 'text-neutral-950' : 'text-destructive-600'}>{issueCount}</span>
          <span className="text-neutral-400"> / </span>
          <span className="text-neutral-950">{total}</span>
        </p>
        <p className="max-w-[62ch] text-body-sm text-neutral-700">
          {complete ? (
            <>Every control account carries a planned value. Schedule indices on this page are computed from a complete baseline.</>
          ) : (
            <>
              control account{issueCount === 1 ? '' : 's'} have progress but no planned value. Schedule performance
              cannot be computed from those accounts, so the schedule index above is only as reliable as the baseline
              behind it.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
