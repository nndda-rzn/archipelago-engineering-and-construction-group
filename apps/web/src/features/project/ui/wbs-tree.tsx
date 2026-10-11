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

/** Progress yang jujur: `null` (tak diketahui) bukan `0%`. */
function ProgressCell({ item }: { item: WbsItem }) {
  const value = item.rollup.progress;
  if (value == null) {
    return (
      <span className="flex items-center gap-2" title="No progress recorded">
        <span className="h-2 w-16 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true" />
        <span className="w-9 text-right font-mono text-caption tabular-nums text-neutral-400">—</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
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

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        void 0;
      }
      return next;
    });
  };

  if (tree.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-xs">
        <p className="text-center text-body-sm text-neutral-500">No WBS yet. Add the first root to begin.</p>
      </div>
    );
  }

  return (
    <div role="tree" aria-label="Work breakdown structure" className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-xs">
      {tree.map((item) => (
        <WbsRow
          key={item.id}
          item={item}
          depth={0}
          collapsed={collapsed}
          selectedId={selectedId}
          onToggle={toggle}
          onSelect={onSelect}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}

function WbsRow({
  item,
  depth,
  collapsed,
  selectedId,
  onToggle,
  onSelect,
  onAddChild,
}: {
  item: WbsItem;
  depth: number;
  collapsed: Record<string, boolean>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (item: WbsItem) => void;
  onAddChild: (item: WbsItem) => void;
}) {
  const hasChildren = item.children.length > 0;
  const isCollapsed = collapsed[item.id] === true;
  const isSelected = selectedId === item.id;

  return (
    <>
      <div
        role="treeitem"
        aria-label={`${item.code} ${item.name}`}
        aria-selected={isSelected}
        aria-expanded={hasChildren ? !isCollapsed : undefined}
        aria-level={depth + 1}
        tabIndex={0}
        onClick={() => onSelect(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(item);
          }
        }}
        className={cn(
          'group flex cursor-pointer items-center gap-2 border-b border-neutral-100 py-2 pr-3 transition-colors duration-fast hover:bg-neutral-50',
          isSelected && 'bg-neutral-100',
        )}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200"
            aria-label={isCollapsed ? `Expand ${item.code}` : `Collapse ${item.code}`}
            aria-expanded={!isCollapsed}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item.id);
            }}
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

        <span className="w-16 shrink-0 truncate font-mono text-caption text-neutral-500" title={item.code}>
          {item.code}
        </span>
        <span className="min-w-0 flex-1 truncate text-body-sm text-neutral-900" title={item.name}>
          {item.name}
        </span>

        {item.isMilestone && (
          <Diamond size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} className="shrink-0 text-warning-600" aria-label="Milestone" role="img" />
        )}

        <ProgressCell item={item} />

        <span className="w-20 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-700">
          <Money value={item.rollup.budget} />
        </span>

        <button
          type="button"
          className="shrink-0 rounded px-1.5 py-0.5 text-caption text-neutral-500 opacity-0 transition-opacity duration-fast hover:bg-neutral-100 hover:text-neutral-800 focus-visible:opacity-100 group-hover:opacity-100"
          aria-label={`Add sub-item to ${item.code}`}
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(item);
          }}
        >
          + Sub
        </button>
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
            onToggle={onToggle}
            onSelect={onSelect}
            onAddChild={onAddChild}
          />
        ))}
    </>
  );
}
