import type { ProjectCostSummaryItem } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';

/** Tabel ringkasan biaya per proyek. `relative` wajib: caption `sr-only` memakai
 * position:absolute dan tanpa leluhur ber-position ia lolos dari `overflow-y:auto`
 * milik `<main>` (lihat catatan di halaman). */
export function ProjectCostTable({ items }: { items: ProjectCostSummaryItem[] }) {
  return (
    <div className="relative mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-body-sm">
        <caption className="sr-only">Project cost summary</caption>
        <thead>
          <tr className="border-b border-neutral-200 text-caption uppercase text-neutral-500">
            <th scope="col" className="py-2 font-medium">Project</th>
            <th scope="col" className="py-2 text-right font-medium">Contract</th>
            <th scope="col" className="py-2 text-right font-medium">Budget</th>
            <th scope="col" className="py-2 text-right font-medium">Cost</th>
            <th scope="col" className="py-2 text-right font-medium">Revenue</th>
            <th scope="col" className="py-2 text-right font-medium">Margin</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.projectCode} className="border-b border-neutral-100 last:border-0">
              <td className="py-2"><span className="font-mono text-neutral-800">{p.projectCode}</span> <span className="text-neutral-500">{p.projectName}</span></td>
              <td className="py-2 text-right font-mono tabular-nums text-neutral-700">{formatIdr(p.contractValue)}</td>
              <td className="py-2 text-right font-mono tabular-nums text-neutral-700">{formatIdr(p.budget)}</td>
              <td className="py-2 text-right font-mono tabular-nums text-neutral-700">{formatIdr(p.cost)}</td>
              <td className="py-2 text-right font-mono tabular-nums text-neutral-700">{formatIdr(p.revenue)}</td>
              <td className={`py-2 text-right font-mono tabular-nums ${p.margin >= 0 ? 'text-success-700' : 'text-destructive-600'}`}>{formatIdr(p.margin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
