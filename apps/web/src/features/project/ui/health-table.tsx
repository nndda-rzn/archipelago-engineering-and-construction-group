import { EmptyCell } from '@aec/ui';
import type { ProjectHealth } from '@aec/api-contracts';
import { formatIdr as fmt } from '@/shared/lib/format';
import { getHealthBarColor } from './health-summary';

export function HealthTable({ data }: { data: ProjectHealth }) {
  const barColor = getHealthBarColor(data.health);

  return (
    <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
      <table className="w-full text-left text-body">
        <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-2">WBS</th>
            <th className="px-4 py-2 text-right">Budget</th>
            <th className="px-4 py-2 text-right">Actual</th>
            <th className="px-4 py-2 text-right">Variance</th>
            <th className="px-4 py-2">Utilization</th>
          </tr>
        </thead>
        <tbody>
          {data.wbs.map((w) => (
            <tr key={w.id} className="border-t border-neutral-100 hover:bg-neutral-50">
              <td className="px-4 py-2">
                <span className="font-mono text-neutral-600">{w.code}</span>
                <span className="ml-2 text-neutral-800">{w.name}</span>
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-neutral-700">{w.budget > 0 ? fmt(w.budget) : <EmptyCell />}</td>
              <td className="px-4 py-2 text-right tabular-nums text-neutral-700">{w.actual > 0 ? fmt(w.actual) : <EmptyCell />}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                <span className={w.variance >= 0 ? 'text-neutral-600' : 'text-destructive-600'}>{fmt(w.variance)}</span>
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-28 overflow-hidden rounded bg-neutral-100">
                    <div className={`h-full ${barColor}`} style={{ width: `${w.utilization == null ? 0 : Math.min(w.utilization, 150)}%` }} />
                  </div>
                  <span className="w-14 text-right font-mono text-caption text-neutral-600">
                    {w.utilization != null ? `${w.utilization}%` : <EmptyCell />}
                  </span>
                </div>
              </td>
            </tr>
          ))}
          {data.wbs.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-4 text-caption text-neutral-500">No WBS yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
