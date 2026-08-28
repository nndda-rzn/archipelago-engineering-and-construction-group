import { Badge } from '@aec/ui';
import type { CommercialEvaluation } from '@/features/procurement';
import { formatIdr as fmt } from '@/shared/lib/format';
import { statusVariant } from './procurement-status';

export function CommercialEvalTable({ data }: { data: CommercialEvaluation }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="text-h3 text-neutral-900">Komparasi Komersial Normalized - {data.rfqNumber}</h3>
      <table className="mt-2 w-full text-left text-body">
        <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-2">Vendor</th>
            <th className="px-4 py-2 text-right">Total</th>
            <th className="px-4 py-2 text-right">Lead Time</th>
            <th className="px-4 py-2 text-right">Skor Normalized</th>
            <th className="px-4 py-2">Teknis</th>
            <th className="px-4 py-2">Pemenang</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((i) => (
            <tr key={i.quoteId} className="border-t border-neutral-100 hover:bg-neutral-50">
              <td className="px-4 py-2 text-neutral-800">{i.vendor}</td>
              <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{fmt(i.totalAmount)}</td>
              <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-600">{i.leadTimeDays} hari</td>
              <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{i.normalizedScore.toLocaleString('id-ID')}</td>
              <td className="px-4 py-2">
                <Badge variant={statusVariant[i.technicalStatus] ?? 'default'}>{i.technicalStatus}</Badge>
              </td>
              <td className="px-4 py-2">{i.isWinner ? <Badge variant="success">Winner</Badge> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
