import { useState } from 'react';
import type { HealthPortfolio } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';

/**
 * Strip hitungan + tabel yang tersembunyi.
 *
 * Tabel adalah ALAT, bukan halaman. Ia tidak ada dalam komposisi sampai
 * diminta — halaman ini dibaca lewat peta dan rail, dan tabel hanya untuk
 * memeriksa angka tepat.
 */
export interface HealthCountStripProps {
  data: HealthPortfolio;
}

export function HealthCountStrip({ data }: HealthCountStripProps) {
  const [showTable, setShowTable] = useState(false);
  const { countByHealth } = data;
  const total = data.items.length;

  return (
    <section aria-label="Portfolio summary" className="border-t border-neutral-200 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="flex flex-wrap items-baseline gap-x-4 text-caption uppercase tracking-wide text-neutral-900/70">
          <span>
            <span className="font-mono tabular-nums text-neutral-900">{countByHealth.ON_TRACK}</span> on track
          </span>
          <span>
            <span className="font-mono tabular-nums text-neutral-900">{countByHealth.AT_RISK}</span> at risk
          </span>
          <span>
            <span className="font-mono tabular-nums text-racing-red-700">{countByHealth.CRITICAL}</span> critical
          </span>
          <span>
            <span className="font-mono tabular-nums text-neutral-900">{countByHealth.NO_BUDGET}</span> no budget
          </span>
        </p>

        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="text-caption uppercase tracking-wide text-neutral-900/70 underline-offset-2 hover:text-neutral-900 hover:underline focus-visible:ring-2 focus-visible:ring-neutral-900"
        >
          {showTable ? 'Hide table' : `All ${total} projects as a table`}
        </button>
      </div>

      {showTable && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-body-sm">
            <caption className="sr-only">All projects with cost, schedule, quality, safety and risk figures.</caption>
            <thead>
              <tr className="border-b border-neutral-300">
                {['Project', 'CPI', 'SPI', 'Progress', 'Utilization', 'NCR', 'Incidents', 'Risks', 'Status'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className={`px-2 py-1.5 text-caption uppercase tracking-wide text-neutral-900/40 ${h === 'Project' ? 'text-left' : 'text-right'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.projectId} className="border-b border-neutral-100">
                  <th scope="row" className="px-2 py-1.5 text-left font-normal">
                    <span className="font-mono text-caption text-neutral-900/40">{i.code}</span>
                    <span className="ml-2 text-neutral-900">{i.name}</span>
                  </th>
                  <td className={`px-2 py-1.5 text-right font-mono tabular-nums ${i.cpi != null && i.cpi < 1 ? 'text-racing-red-700' : 'text-neutral-900'}`}>
                    {i.cpi == null ? '—' : i.cpi.toFixed(2)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-mono tabular-nums ${i.spi != null && i.spi < 1 ? 'text-racing-red-700' : 'text-neutral-900'}`}>
                    {i.spi == null ? 'n/a' : i.spi.toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-900/70">{i.progressPercent}%</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-900/70">
                    {i.utilization == null ? '—' : `${i.utilization}%`}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-900/70">{i.ncrs}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-900/70">{i.incidents}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-900/70">{i.risks}</td>
                  <td className="px-2 py-1.5 text-right text-caption uppercase tracking-wide text-neutral-900/70">
                    {i.health.replace('_', ' ').toLowerCase()}
                    {i.partial ? ' *' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-400">
                <th scope="row" className="px-2 py-1.5 text-left text-body-sm font-medium text-neutral-900">Portfolio</th>
                <td colSpan={8} className="px-2 py-1.5 text-right font-mono text-caption tabular-nums text-neutral-900/70">
                  {formatIdr(data.items.reduce((s, i) => s + i.bac, 0))} budget ·{' '}
                  {formatIdr(data.items.reduce((s, i) => s + i.ac, 0))} actual
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-1 text-caption text-neutral-900/40">* SPI not available, so the status is based on cost only.</p>
        </div>
      )}
    </section>
  );
}
