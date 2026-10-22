import { useMemo, useState } from 'react';
import type { BudgetStatement as Statement } from '@aec/api-contracts';
import { formatIdr, formatIdrCompact } from '@/shared/lib/format';
import { StatementRow } from './statement-row';

/**
 * Pernyataan biaya: satu tabel, enam kolom angka, satu baris total.
 *
 * Bentuk tabel dipilih karena datanya memang perbandingan antar kategori
 * (baris WBS) sekaligus pernyataan biaya — bukan karena gaya. Kartu KPI akan
 * memecah angka yang justru harus dibaca berderet: baseline, revisi, komitmen,
 * aktual, sisa, selisih.
 *
 * Kolom WBS sticky dan tabel dapat di-scroll horizontal: enam kolom angka tidak
 * akan pernah muat di 375px tanpa mengorbankan angka itu sendiri.
 */
export interface BudgetStatementProps {
  statement: Statement;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  published: boolean;
  onSave?: (costType: string, amount: number) => void;
  saving?: boolean;
}

const MONEY_CELL = 'px-2 py-1.5 text-right';

export function BudgetStatement({
  statement,
  selectedId,
  onSelect,
  published,
  onSave,
  saving = false,
}: BudgetStatementProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  /** Anak dari induk yang dilipat disembunyikan, tanpa membuang barisnya. */
  const visible = useMemo(() => {
    const byId = new Map(statement.rows.map((r) => [r.id, r]));
    return statement.rows.filter((r) => {
      let parentId = r.parentId;
      const seen = new Set<string>([r.id]);
      while (parentId != null) {
        if (seen.has(parentId)) return true;
        seen.add(parentId);
        if (collapsed.has(parentId)) return false;
        parentId = byId.get(parentId)?.parentId ?? null;
      }
      return true;
    });
  }, [statement.rows, collapsed]);

  const maxVariance = useMemo(
    () => visible.reduce((max, r) => Math.max(max, Math.abs(r.variance)), 0),
    [visible],
  );

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasBaseline = statement.baseline != null;
  const { totals } = statement;

  return (
    <div data-testid="statement-scroll" className="overflow-x-auto border-y border-neutral-300 bg-surface-raised">
      <table className="w-full min-w-[56rem] border-collapse text-body-sm">
        <caption className="sr-only">
          Budget statement for this project: baseline, revised, committed, actual, available and variance per WBS.
        </caption>
        <thead className="sticky top-0 z-20 bg-surface-raised">
          <tr className="border-b border-neutral-300">
            <th scope="col" className="sticky left-0 z-20 bg-surface-raised px-2 py-1.5 text-left text-overline uppercase text-neutral-500">
              WBS
            </th>
            <th scope="col" className={`${MONEY_CELL} w-[7.5rem] text-overline uppercase text-neutral-500`}>Baseline</th>
            <th scope="col" className={`${MONEY_CELL} w-[7.5rem] text-overline uppercase text-neutral-500`}>Revised</th>
            <th scope="col" className={`${MONEY_CELL} w-[7.5rem] text-overline uppercase text-neutral-500`}>Committed</th>
            <th scope="col" className={`${MONEY_CELL} w-[7.5rem] text-overline uppercase text-neutral-500`}>Actual</th>
            <th scope="col" className={`${MONEY_CELL} w-[7.5rem] text-overline uppercase text-neutral-500`}>Available</th>
            <th scope="col" className={`${MONEY_CELL} w-[8.5rem] text-overline uppercase text-neutral-500`}>Variance</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((node) => (
            <StatementRow
              key={node.id}
              node={node}
              hasBaseline={hasBaseline}
              selected={selectedId === node.id}
              expanded={!collapsed.has(node.id)}
              onToggle={toggle}
              onSelect={(id) => onSelect(selectedId === id ? null : id)}
              published={published}
              saving={saving}
              maxVariance={maxVariance}
              onSave={onSave ?? (() => undefined)}
            />
          ))}
        </tbody>
        <tfoot data-testid="statement-total" className="border-t-2 border-neutral-400">
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-surface-raised px-2 py-2 text-left text-body-sm font-medium text-neutral-900">
              Total
            </th>
            <td className={MONEY_CELL}>
              {hasBaseline ? (
                <span className="font-mono text-body-sm font-medium tabular-nums text-neutral-900" title={formatIdr(totals.baseline)}>
                  {formatIdrCompact(totals.baseline)}
                </span>
              ) : (
                <span className="text-neutral-400">—</span>
              )}
            </td>
            <td className={MONEY_CELL}>
              <span className="font-mono text-body-sm font-medium tabular-nums text-neutral-900" title={formatIdr(totals.revised)}>
                {formatIdrCompact(totals.revised)}
              </span>
            </td>
            <td className={MONEY_CELL}>
              <span className="font-mono text-body-sm font-medium tabular-nums text-neutral-900" title={formatIdr(totals.committed)}>
                {formatIdrCompact(totals.committed)}
              </span>
            </td>
            <td className={MONEY_CELL}>
              <span className="font-mono text-body-sm font-medium tabular-nums text-neutral-900" title={formatIdr(totals.actual)}>
                {formatIdrCompact(totals.actual)}
              </span>
            </td>
            <td className={MONEY_CELL}>
              <span className="font-mono text-body-sm font-medium tabular-nums text-neutral-900" title={formatIdr(totals.available)}>
                {formatIdrCompact(totals.available)}
              </span>
            </td>
            <td className={MONEY_CELL}>
              <span
                className={`font-mono text-body-sm font-medium tabular-nums ${totals.variance < 0 ? 'text-destructive-700' : 'text-neutral-900'}`}
                title={formatIdr(totals.variance)}
              >
                {totals.variance > 0 ? '+' : totals.variance < 0 ? '−' : ''}
                {formatIdrCompact(Math.abs(totals.variance))}
              </span>
            </td>
          </tr>
          <tr>
            <td colSpan={7} className="sticky left-0 px-2 pb-2 text-caption text-neutral-600">
              {/* EAC/VAC hanya di level proyek: Forecast tidak berdimensi WBS. */}
              EAC <span className="font-mono tabular-nums text-neutral-800">{totals.eac == null ? '—' : formatIdrCompact(totals.eac)}</span>
              {' · '}
              VAC <span className={`font-mono tabular-nums ${totals.vac != null && totals.vac < 0 ? 'text-destructive-700' : 'text-neutral-800'}`}>
                {totals.vac == null ? '—' : formatIdrCompact(totals.vac)}
              </span>
              {' · '}
              Contract <span className="font-mono tabular-nums text-neutral-800">{formatIdrCompact(totals.contractValue)}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
