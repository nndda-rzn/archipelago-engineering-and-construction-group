import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ICON_STROKE } from '@aec/ui';
import type { BudgetSummary } from '@aec/api-contracts';
import { CostTypeBar } from './cost-type-bar';

type Node = BudgetSummary['wbs'][number];

export interface BudgetTreeProps {
  /** Daftar datar ber-`depth` seperti yang dikirim API. */
  nodes: Node[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Angka uang ringkas untuk kolom sempit; nominal penuh ada di `title`. */
function compact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${Math.round((abs / 1e12) * 100) / 100} T`;
  if (abs >= 1e9) return `${sign}${Math.round((abs / 1e9) * 100) / 100} M`;
  if (abs >= 1e6) return `${sign}${Math.round((abs / 1e6) * 100) / 100} jt`;
  if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3)} rb`;
  return `${sign}${Math.round(abs)}`;
}

function full(n: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);
}

/**
 * Pohon WBS budget.
 *
 * Daftar dari API sudah datar dan ber-`depth`; komponen ini menyusunnya kembali
 * menjadi pohon untuk keperluan lipat/buka. Simpul yang `parentId`-nya tidak ada
 * di daftar diperlakukan sebagai root — sama seperti aturan di sisi API — supaya
 * tidak ada baris yang hilang dari layar.
 */
export function BudgetTree({ nodes, selectedId, onSelect }: BudgetTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { roots, childrenOf, hiddenIds } = useMemo(() => {
    const known = new Set(nodes.map((n) => n.id));
    const children = new Map<string, Node[]>();
    const top: Node[] = [];
    for (const n of nodes) {
      if (n.parentId != null && known.has(n.parentId) && n.parentId !== n.id) {
        const list = children.get(n.parentId) ?? [];
        list.push(n);
        children.set(n.parentId, list);
      } else {
        top.push(n);
      }
    }
    // Hitung id yang tersembunyi karena leluhurnya dilipat.
    const hidden = new Set<string>();
    const walk = (list: Node[], isHidden: boolean) => {
      for (const n of list) {
        if (isHidden) hidden.add(n.id);
        const kids = children.get(n.id) ?? [];
        walk(kids, isHidden || collapsed.has(n.id));
      }
    };
    walk(top, false);
    return { roots: top, childrenOf: children, hiddenIds: hidden };
  }, [nodes, collapsed]);

  if (nodes.length === 0) {
    return <p className="px-4 py-8 text-center text-body-sm text-neutral-500">No WBS yet. Add one on the WBS page first.</p>;
  }

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderRow = (n: Node) => {
    if (hiddenIds.has(n.id)) return null;
    const hasChildren = n.childrenCount > 0 || (childrenOf.get(n.id)?.length ?? 0) > 0;
    const isCollapsed = collapsed.has(n.id);
    const isSelected = selectedId === n.id;
    const usedPct = n.budget > 0 ? (n.used / n.budget) * 100 : null;

    return (
      <li key={n.id}>
        <div
          className={`group grid grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_7rem] items-center gap-2 border-b border-neutral-100 pr-2 transition-colors duration-fast ${
            isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'
          }`}
        >
          <div className="flex min-w-0 items-center gap-1" style={{ paddingLeft: `${n.depth * 16}px` }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggle(n.id)}
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${n.name}`}
                className="shrink-0 rounded p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800"
              >
                {isCollapsed ? <ChevronRight size={14} strokeWidth={ICON_STROKE} aria-hidden="true" /> : <ChevronDown size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />}
              </button>
            ) : (
              <span className="w-[18px] shrink-0" aria-hidden="true" />
            )}
            <button
              type="button"
              onClick={() => onSelect(n.id)}
              aria-current={isSelected ? 'true' : undefined}
              className="min-w-0 flex-1 truncate py-2 text-left text-body-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800"
            >
              <span className="mr-2 font-mono text-caption text-neutral-500">{n.code}</span>
              {n.name}
            </button>
          </div>
          <span className="text-right font-mono text-body-sm tabular-nums text-neutral-800" title={full(n.budget)}>{compact(n.budget)}</span>
          <span
            className={`text-right font-mono text-body-sm tabular-nums ${n.remaining < 0 ? 'text-destructive-600' : 'text-neutral-600'}`}
            title={full(n.used)}
          >
            {compact(n.used)}
          </span>
          <CostTypeBar byCostType={n.byCostType} total={n.budget} usedPercent={usedPct} />
        </div>
        {(childrenOf.get(n.id)?.length ?? 0) > 0 && <ul>{childrenOf.get(n.id)!.map(renderRow)}</ul>}
      </li>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_7rem] items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-2 py-1.5 text-caption uppercase tracking-wide text-neutral-500">
        <span>WBS</span>
        <span className="text-right">Budget</span>
        <span className="text-right">Used</span>
        <span>Allocation</span>
      </div>
      <ul>{roots.map(renderRow)}</ul>
    </div>
  );
}
