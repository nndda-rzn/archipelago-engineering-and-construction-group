import { ChevronRight } from 'lucide-react';
import type { WbsItem } from '@aec/api-contracts';

export function findWbsCode(nodes: WbsItem[], id: string): string | undefined {
  for (const node of nodes) {
    if (node.id === id) return node.code;
    const found = findWbsCode(node.children, id);
    if (found) return found;
  }
  return undefined;
}

export function WbsTree({ tree, onAddChild }: { tree: WbsItem[]; onAddChild: (item: WbsItem) => void }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
      {tree.length === 0 ? <p className="p-6 text-center text-body-sm text-neutral-500">Belum ada WBS. Tambah root pertama.</p> : tree.map((item) => <WbsRow key={item.id} item={item} depth={0} onAddChild={onAddChild} />)}
    </div>
  );
}

function WbsRow({ item, depth, onAddChild }: { item: WbsItem; depth: number; onAddChild: (item: WbsItem) => void }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-neutral-100 py-2 hover:bg-neutral-50" style={{ paddingLeft: `${depth * 24 + 16}px` }}>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
        <span className="font-mono text-body-sm text-neutral-700">{item.code}</span>
        <span className="text-body-sm text-neutral-900">{item.name}</span>
        <button type="button" className="ml-auto rounded px-2 py-0.5 text-caption text-racing-red-600 hover:bg-racing-red-50" onClick={() => onAddChild(item)}>+ Sub</button>
      </div>
      {item.children.map((child) => <WbsRow key={child.id} item={child} depth={depth + 1} onAddChild={onAddChild} />)}
    </>
  );
}
