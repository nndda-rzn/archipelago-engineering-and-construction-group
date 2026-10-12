import { useState } from 'react';
import { ChevronRight, Diamond } from 'lucide-react';
import { BulletBar, ICON_SIZE, ICON_STROKE, cn } from '@aec/ui';
import type { WbsItem } from '@aec/api-contracts';
import { Money } from '@/shared/ui/money';

const STORAGE_KEY = 'aec.wbs.collapsed';

function readCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function findWbsCode(nodes: WbsItem[], id: string): string | undefined {
  for (const node of nodes) {
    if (node.id === id) return node.code;
    const found = findWbsCode(node.children, id);
    if (found) return found;
  }
  return undefined;
}

/** Daftar node dalam urutan tampilan (depth-first, menghormati collapse). */
function visibleRows(nodes: WbsItem[], collapsed: Record<string, boolean>): WbsItem[] {
  const out: WbsItem[] = [];
  const walk = (items: WbsItem[]) => {
    for (const item of items) {
      out.push(item);
      if (item.children.length > 0 && collapsed[item.id] !== true) walk(item.children);
    }
  };
  walk(nodes);
  return out;
}

/** Progress yang jujur: `null` (tak diketahui) bukan `0%`. */
function ProgressCell({ item }: { item: WbsItem }) {
  const value = item.rollup.progress;
  if (value == null) {
    return (
      <span className="hidden items-center gap-2 sm:flex" title="No progress recorded">
        <span className="h-2 w-16 overflow-hidden rounded-sm bg-neutral-100" aria-hidden="true" />
        <span data-slot="wbs-progress-unknown" className="w-9 text-right font-mono text-caption tabular-nums text-neutral-500">—</span>
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-2 sm:flex">
      <BulletBar value={value} max={100} label={`${item.code} progress`} tone={value >= 100 ? 'success' : 'neutral'} className="w-16" />
      <span className="w-9 text-right font-mono text-caption tabular-nums text-neutral-600">{Math.round(value)}%</span>
    </span>
  );
}

export function WbsTree({
  tree,
  selectedId,
  onSelect,
  onAddChild,
}: {
  tree: WbsItem[];
  selectedId: string | null;
  onSelect: (item: WbsItem) => void;
  onAddChild: (item: WbsItem) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => readCollapsed());
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const setCollapse = (id: string, next: boolean) => {
    setCollapsed((prev) => {
      const updated = { ...prev, [id]: next };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        void 0;
      }
      return updated;
    });
  };

  const rows = visibleRows(tree, collapsed);
  // Roving tabindex: node terpilih → node terfokus → baris pertama.
  const tabStopId = (selectedId && rows.some((r) => r.id === selectedId) ? selectedId : null)
    ?? (focusedId && rows.some((r) => r.id === focusedId) ? focusedId : null)
    ?? rows[0]?.id
    ?? null;

  const focusRow = (id: string) => {
    setFocusedId(id);
    requestAnimationFrame(() => document.getElementById(`wbs-row-${id}`)?.focus());
  };

  const onKeyDown = (e: React.KeyboardEvent, item: WbsItem, index: number) => {
    const hasChildren = item.children.length > 0;
    const isCollapsed = collapsed[item.id] === true;
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = rows[index + 1];
        if (next) focusRow(next.id);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = rows[index - 1];
        if (prev) focusRow(prev.id);
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        if (hasChildren && isCollapsed) setCollapse(item.id, false);
        else if (hasChildren) {
          const first = item.children[0];
          if (first) focusRow(first.id);
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (hasChildren && !isCollapsed) setCollapse(item.id, true);
        else {
          // Naik ke induk bila ada.
          const parent = rows.slice(0, index).reverse().find((r) => r.children.some((c) => c.id === item.id));
          if (parent) focusRow(parent.id);
        }
        break;
      }
      case 'Home': {
        e.preventDefault();
        if (rows[0]) focusRow(rows[0].id);
        break;
      }
      case 'End': {
        e.preventDefault();
        const last = rows[rows.length - 1];
        if (last) focusRow(last.id);
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        onSelect(item);
        break;
      }
      default:
        break;
    }
  };

  if (tree.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 bg-surface-raised p-6 shadow-xs">
        <p className="text-center text-body-sm text-neutral-500">No WBS yet. Add the first root to begin.</p>
      </div>
    );
  }

  const rowByIndex = new Map(rows.map((r, i) => [r.id, i]));

  return (
    <div role="tree" aria-label="Work breakdown structure" className="overflow-x-auto rounded-md border border-neutral-200 bg-surface-raised shadow-xs">
      <div className="min-w-0">
        {tree.map((item) => (
          <WbsRow
            key={item.id}
            item={item}
            depth={0}
            collapsed={collapsed}
            selectedId={selectedId}
            tabStopId={tabStopId}
            rowByIndex={rowByIndex}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onToggle={setCollapse}
            onKeyDown={onKeyDown}
          />
        ))}
      </div>
    </div>
  );
}

function WbsRow({
  item,
  depth,
  collapsed,
  selectedId,
  tabStopId,
  rowByIndex,
  onSelect,
  onAddChild,
  onToggle,
  onKeyDown,
}: {
  item: WbsItem;
  depth: number;
  collapsed: Record<string, boolean>;
  selectedId: string | null;
  tabStopId: string | null;
  rowByIndex: Map<string, number>;
  onSelect: (item: WbsItem) => void;
  onAddChild: (item: WbsItem) => void;
  onToggle: (id: string, next: boolean) => void;
  onKeyDown: (e: React.KeyboardEvent, item: WbsItem, index: number) => void;
}) {
  const hasChildren = item.children.length > 0;
  const isCollapsed = collapsed[item.id] === true;
  const isSelected = selectedId === item.id;
  const isRoot = depth === 0;

  return (
    <>
      <div
        id={`wbs-row-${item.id}`}
        role="treeitem"
        aria-label={`${item.code} ${item.name}`}
        aria-selected={isSelected}
        aria-expanded={hasChildren ? !isCollapsed : undefined}
        aria-level={depth + 1}
        tabIndex={tabStopId === item.id ? 0 : -1}
        onClick={() => onSelect(item)}
        onFocus={() => onSelect(item)}
        onKeyDown={(e) => onKeyDown(e, item, rowByIndex.get(item.id) ?? 0)}
        className={cn(
          'group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-neutral-100 py-1.5 pr-3 transition-colors duration-fast hover:bg-neutral-50',
          isSelected && 'bg-neutral-100',
          isRoot && 'font-medium',
        )}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Kolom identitas: guide kedalaman + chevron + kode + nama */}
        <span className="flex min-w-0 items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              tabIndex={-1}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200"
              aria-label={isCollapsed ? `Expand ${item.code}` : `Collapse ${item.code}`}
              onClick={(e) => { e.stopPropagation(); onToggle(item.id, !isCollapsed); }}
            >
              <ChevronRight
                size={ICON_SIZE.sm}
                strokeWidth={ICON_STROKE}
                className={cn('transition-transform duration-fast', !isCollapsed && 'rotate-90')}
                aria-hidden="true"
              />
            </button>
          ) : (
            <span className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className={cn('w-16 shrink-0 truncate font-mono text-caption tabular-nums', isRoot ? 'text-neutral-600' : 'text-neutral-500')} title={item.code}>
            {item.code}
          </span>
          <span className={cn('min-w-0 flex-1 truncate text-body-sm', isRoot ? 'text-neutral-950' : 'text-neutral-800')} title={item.name}>
            {item.name}
          </span>
          {item.isMilestone && (
            <Diamond size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} className="shrink-0 text-warning-600" aria-label="Milestone" role="img" />
          )}
        </span>

        {/* Kolom angka: progress + biaya, rata kanan agar bisa dibandingkan */}
        <span className="flex shrink-0 items-center gap-4">
          <ProgressCell item={item} />
          <span className="hidden w-20 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-700 sm:block">
            <Money value={item.rollup.budget} />
          </span>
          <button
            type="button"
            tabIndex={-1}
            className="shrink-0 rounded px-1.5 py-0.5 text-caption text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            aria-label={`Add child to ${item.code}`}
            onClick={(e) => { e.stopPropagation(); onAddChild(item); }}
          >
            + Add child
          </button>
        </span>
      </div>

      {hasChildren &&
        !isCollapsed &&
        item.children.map((child) => (
          <WbsRow
            key={child.id}
            item={child}
            depth={depth + 1}
            collapsed={collapsed}
            selectedId={selectedId}
            tabStopId={tabStopId}
            rowByIndex={rowByIndex}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onToggle={onToggle}
            onKeyDown={onKeyDown}
          />
        ))}
    </>
  );
}
