import { formatIdr } from '@/shared/lib/format';

/**
 * Keadaan "belum ada alokasi" — panel tenang, bukan tumpukan zona kosong.
 *
 * Proyek tanpa budget sama sekali tidak butuh bar kosong, tabel nol, riwayat
 * kosong, dan daftar "simpul tanpa budget". Semua itu akan tampil sebagai lima
 * kotak kosong yang memberitahu hal yang sama: belum ada alokasi. Satu panel
 * yang menyebut apa yang ADA dan apa yang BELUM lebih jujur, dan lebih cepat
 * dibaca.
 */
export interface EmptyBudgetPanelProps {
  /** Biaya yang tetap tercatat walau belum ada alokasi (mis. material terpakai). */
  actual: number;
  nodeCount: number;
}

export function EmptyBudgetPanel({ actual, nodeCount }: EmptyBudgetPanelProps) {
  return (
    <section aria-label="No budget allocated" className="border-y border-neutral-300 py-8">
      <p className="text-overline uppercase text-neutral-500">No budget allocated</p>
      <p className="mt-2 max-w-[60ch] text-body text-neutral-800">
        This project has {nodeCount} WBS node{nodeCount === 1 ? '' : 's'} but no cost allocated to any of them, so there
        is nothing to compare against.
      </p>

      {actual > 0 && (
        <p className="mt-3 max-w-[60ch] text-body-sm text-neutral-600">
          Cost is still being recorded:{' '}
          <span className="font-mono tabular-nums text-neutral-900">{formatIdr(actual)}</span> of actual spend has been
          booked, but without an allocation it cannot be measured against anything.
        </p>
      )}

      <p className="mt-4 max-w-[60ch] text-body-sm text-neutral-600">
        Allocate cost to the WBS breakdown, then freeze it here as the first baseline.
      </p>
    </section>
  );
}
