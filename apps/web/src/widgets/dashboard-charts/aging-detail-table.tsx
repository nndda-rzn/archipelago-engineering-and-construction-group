import { EmptyState } from '@aec/ui';
import type { AgingBucket } from '@aec/api-contracts';
import { formatDate, formatIdr } from '@/shared/lib/format';

export interface AgingDetailTableProps {
  /** Semua bucket; baris digabung dari bucket yang dipilih. */
  buckets: AgingBucket[];
  selectedBucket: string;
  /** Label AR/AP untuk judul dan kolom "party". */
  side: 'AR' | 'AP';
}

/**
 * Daftar invoice di balik sebuah bucket — inilah bagian yang membuat laporan aging
 * bisa ditindaklanjuti (mana yang harus ditagih / dibayar lebih dulu). Tanpa
 * bucket dipilih, tampil panduan, bukan tabel kosong tanpa penjelasan.
 */
export function AgingDetailTable({ buckets, selectedBucket, side }: AgingDetailTableProps) {
  if (!selectedBucket) {
    return (
      <EmptyState
        title="Select an aging bucket"
        description="Pick a bucket above to see the invoices behind it."
      />
    );
  }

  const rows = buckets
    .filter((b) => b.bucket === selectedBucket)
    .flatMap((b) => b.detail)
    .sort((a, b) => b.outstanding - a.outstanding);

  if (rows.length === 0) {
    return (
      <EmptyState
        title={`No invoices in ${selectedBucket}`}
        description="Nothing outstanding falls in this bucket for the current filter."
      />
    );
  }

  const total = rows.reduce((s, r) => s + r.outstanding, 0);

  return (
    <div>
      <p className="mb-2 text-caption text-neutral-500">
        {rows.length} invoice{rows.length === 1 ? '' : 's'} · total <span className="font-mono tabular-nums text-neutral-700">{formatIdr(total)}</span>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-body-sm">
          <caption className="sr-only">Invoices in the {selectedBucket} bucket</caption>
          <thead>
            <tr className="border-b border-neutral-200 text-caption uppercase text-neutral-500">
              <th scope="col" className="py-2 font-medium">Invoice</th>
              <th scope="col" className="py-2 font-medium">{side === 'AR' ? 'Client' : 'Vendor'}</th>
              <th scope="col" className="py-2 font-medium">Project</th>
              <th scope="col" className="py-2 font-medium">Date</th>
              <th scope="col" className="py-2 text-right font-medium">Age</th>
              <th scope="col" className="py-2 text-right font-medium">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.invoiceNumber} className="border-b border-neutral-100 last:border-0">
                <td className="py-2 font-mono text-neutral-800">{r.invoiceNumber}</td>
                <td className="py-2 text-neutral-700">{r.party}</td>
                <td className="py-2 font-mono text-caption text-neutral-500">{r.projectCode ?? '—'}</td>
                <td className="py-2 text-neutral-600">{formatDate(r.date)}</td>
                <td className="py-2 text-right font-mono tabular-nums text-neutral-600">{r.ageDays}d</td>
                <td className="py-2 text-right font-mono tabular-nums text-neutral-900">{formatIdr(r.outstanding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
