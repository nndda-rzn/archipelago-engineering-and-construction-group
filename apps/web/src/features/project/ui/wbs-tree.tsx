import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { WbsItem } from '@aec/api-contracts';

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

export function WbsTree({ tree, onAddChild }: { tree: WbsItem[]; onAddChild: (item: WbsItem) => void }) {
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

  return (
    <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
      {tree.length === 0 ? <p className="p-6 text-center text-body-sm text-neutral-500">Belum ada WBS. Tambah root pertama.</p> : tree.map((item) => <WbsRow key={item.id} item={item} depth={0} collapsed={collapsed} onToggle={toggle} onAddChild={onAddChild} />)}
    </div>
  );
}

function WbsRow({ item, depth, collapsed, onToggle, onAddChild }: { item: WbsItem; depth: number; collapsed: Record<string, boolean>; onToggle: (id: string) => void; onAddChild: (item: WbsItem) => void }) {
  const hasChildren = item.children.length > 0;
  const isCollapsed = collapsed[item.id] === true;
  return (
    <>
      <div className="flex items-center gap-2 border-b border-neutral-100 py-2 hover:bg-neutral-50" style={{ paddingLeft: `${depth * 24 + 16}px` }}>
        {hasChildren ? (
          <button
            type="button"
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200"
            aria-label={isCollapsed ? `Buka ${item.code}` : `Tutup ${item.code}`}
            aria-expanded={!isCollapsed}
            onClick={() => onToggle(item.id)}
          >
            <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-fast ${isCollapsed ? '' : 'rotate-90'}`} aria-hidden="true" />
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="font-mono text-body-sm text-neutral-700">{item.code}</span>
        <span className="text-body-sm text-neutral-900">{item.name}</span>
        <button type="button" className="ml-auto rounded px-2 py-0.5 text-caption text-racing-red-600 hover:bg-racing-red-50" onClick={() => onAddChild(item)}>+ Sub</button>
      </div>
      {hasChildren && !isCollapsed && item.children.map((child) => <WbsRow key={child.id} item={child} depth={depth + 1} collapsed={collapsed} onToggle={onToggle} onAddChild={onAddChild} />)}
    </>
  );
}
