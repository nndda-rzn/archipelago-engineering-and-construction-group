import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, EmptyState } from '@aec/ui';
import type { AgingBucket } from '@aec/api-contracts';
import { formatDate } from '@/shared/lib/format';
import { Money } from '@/shared/ui/money';

export interface AgingDetailDialogProps {
  open: boolean;
  /** Bucket yang sedang dibuka ('' = tidak ada). */
  bucket: string;
  buckets: AgingBucket[];
  side: 'AR' | 'AP';
  onOpenChange: (open: boolean) => void;
}

/**
 * Detail faktur di balik sebuah bucket aging, ditampilkan sebagai **modal** yang
 * hanya muncul saat bucket diklik. Sebelumnya blok ini menetap di tengah halaman
 * dan menyisakan ruang kosong besar ketika belum ada bucket terpilih.
 */
export function AgingDetailDialog({ open, bucket, buckets, side, onOpenChange }: AgingDetailDialogProps) {
  const rows = buckets
    .filter((b) => b.bucket === bucket)
    .flatMap((b) => b.detail)
    .sort((a, b) => b.outstanding - a.outstanding);
  const total = rows.reduce((s, r) => s + r.outstanding, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Aging detail · {bucket}</DialogTitle>
          <DialogDescription>
            {side === 'AR' ? 'Receivable' : 'Payable'} invoices behind this bucket, largest outstanding first.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <EmptyState
            title={`No invoices in ${bucket}`}
            description="Nothing outstanding falls in this bucket for the current filter."
          />
        ) : (
          <>
            <p className="mb-2 text-caption text-neutral-500">
              {rows.length} invoice{rows.length === 1 ? '' : 's'} · total{' '}
              <Money value={total} className="font-mono tabular-nums text-neutral-700" />
            </p>
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full border-collapse text-left text-body-sm">
                <caption className="sr-only">Invoices in the {bucket} bucket</caption>
                <thead className="sticky top-0 bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-caption uppercase text-neutral-500">
                    <th scope="col" className="px-2 py-2 font-medium">Invoice</th>
                    <th scope="col" className="px-2 py-2 font-medium">{side === 'AR' ? 'Client' : 'Vendor'}</th>
                    <th scope="col" className="px-2 py-2 font-medium">Project</th>
                    <th scope="col" className="px-2 py-2 font-medium">Date</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Age</th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.invoiceNumber} className="border-b border-neutral-100 last:border-0">
                      <td className="px-2 py-2 font-mono text-neutral-800">{r.invoiceNumber}</td>
                      <td className="px-2 py-2 text-neutral-700">{r.party}</td>
                      <td className="px-2 py-2 font-mono text-caption text-neutral-500">{r.projectCode ?? '—'}</td>
                      <td className="px-2 py-2 text-neutral-600">{formatDate(r.date)}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-neutral-600">{r.ageDays}d</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-neutral-900">
                        <Money value={r.outstanding} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
