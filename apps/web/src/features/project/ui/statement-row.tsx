import { ChevronDown, ChevronRight } from 'lucide-react';
import { ICON_STROKE } from '@aec/ui';
import type { BudgetStatementRow } from '@aec/api-contracts';
import { formatIdr, formatIdrCompact } from '@/shared/lib/format';
import { BudgetInspector } from './budget-inspector';
import { VarianceCell } from './variance-cell';

/**
 * Satu baris pernyataan biaya.
 *
 * Kolom WBS memakai `<th scope="row">`, bukan `<td>`: pembaca layar perlu tahu
 * bahwa angka di baris ini milik WBS tersebut, bukan sekadar sel pertama.
 *
 * Inspector dirender **di bawah baris** sebagai baris kedua, bukan di rail
 * kanan: pada layar 1366px, rail kanan menyisakan kolom WBS terlalu sempit untuk
 * enam kolom angka, dan pengguna kehilangan konteks perbandingan saat mengedit.
 */
export interface StatementRowProps {
  node: BudgetStatementRow;
  hasBaseline: boolean;
  selected: boolean;
  expanded: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  published: boolean;
  onSave: (costType: string, amount: number) => void;
  saving: boolean;
  /** Selisih terbesar yang terlihat, untuk menskalakan bilah variance. */
  maxVariance: number;
}

const COLUMNS = 7;

function money(n: number) {
  return (
    <span className="font-mono text-body-sm tabular-nums text-neutral-800" title={formatIdr(n)}>
      {formatIdrCompact(n)}
    </span>
  );
}

export function StatementRow({
  node,
  hasBaseline,
  selected,
  expanded,
  onToggle,
  onSelect,
  published,
  onSave,
  saving,
  maxVariance,
}: StatementRowProps) {
  const hasChildren = node.childrenCount > 0;

  return (
    <>
      <tr
        data-testid={`row-${node.id}`}
        aria-current={selected ? 'true' : undefined}
        className={`border-b border-neutral-100 ${selected ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
      >
        <th scope="row" className="sticky left-0 z-10 bg-surface-raised px-2 py-1.5 text-left font-normal">
          <span className="flex items-center gap-1" data-depth={node.depth} style={{ paddingLeft: `${node.depth * 14}px` }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggle(node.id)}
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`}
                className="shrink-0 rounded p-0.5 text-neutral-500 hover:bg-neutral-200 focus-visible:ring-2 focus-visible:ring-neutral-800"
              >
                {expanded ? <ChevronDown size={14} strokeWidth={ICON_STROKE} aria-hidden="true" /> : <ChevronRight size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />}
              </button>
            ) : (
              <span className="w-[18px] shrink-0" aria-hidden="true" />
            )}
            <button
              type="button"
              onClick={() => onSelect(node.id)}
              className="min-w-0 flex-1 truncate text-left text-body-sm text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-800"
            >
              <span className="mr-2 font-mono text-caption text-neutral-500">{node.code}</span>
              {node.name}
            </button>
          </span>
        </th>
        <td data-testid={`cell-baseline-${node.id}`} className="px-2 py-1.5 text-right">
          {hasBaseline ? money(node.baseline) : <span className="text-neutral-400">—</span>}
        </td>
        <td data-testid={`cell-revised-${node.id}`} className="px-2 py-1.5 text-right">{money(node.revised)}</td>
        <td data-testid={`cell-committed-${node.id}`} className="px-2 py-1.5 text-right">{money(node.committed)}</td>
        <td data-testid={`cell-actual-${node.id}`} className="px-2 py-1.5 text-right">{money(node.actual)}</td>
        <td data-testid={`cell-available-${node.id}`} className="px-2 py-1.5 text-right">{money(node.available)}</td>
        <td data-testid={`cell-variance-${node.id}`} className="px-2 py-1.5 text-right">
          <VarianceCell value={node.variance} max={maxVariance} label="Variance" />
        </td>
      </tr>

      {selected && (
        <tr>
          <td colSpan={COLUMNS} className="border-b border-neutral-200 bg-neutral-50 p-0">
            <BudgetInspector
              // `key` me-reset state form saat simpul berganti, tanpa effect.
              key={node.id}
              node={node}
              published={published}
              saving={saving}
              onSave={onSave}
            />
          </td>
        </tr>
      )}
    </>
  );
}
