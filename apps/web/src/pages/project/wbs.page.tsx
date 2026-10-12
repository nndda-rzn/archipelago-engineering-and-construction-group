import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button, EntitySelect, ErrorState, ICON_SIZE, ICON_STROKE, Input, Label, Skeleton } from '@aec/ui';
import type { WbsItem } from '@aec/api-contracts';
import { useWbsTree } from '@/entities/wbs';
import { useProjects } from '@/entities/project';
import { WbsForm, WbsInspector, WbsTree } from '@/features/project/ui';
import { useUrlFilter } from '@/shared/lib/use-url-state';
import { PAGE_SIZE_LARGE as PAGE_SIZE } from '@/shared/lib/pagination';

/** Pencocokan sederhana: kode atau nama node mengandung `q`. */
function matches(item: WbsItem, q: string): boolean {
  const needle = q.toLowerCase();
  return item.code.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle);
}

/** Saring pohon: pertahankan node yang cocok beserta leluhur/keturunannya. */
function filterTree(nodes: WbsItem[], q: string): WbsItem[] {
  if (!q.trim()) return nodes;
  const walk = (items: WbsItem[]): WbsItem[] =>
    items
      .map((it) => ({ ...it, children: walk(it.children) }))
      .filter((it) => matches(it, q) || it.children.length > 0);
  return walk(nodes);
}

export function WbsPage() {
  const [projectId, setProjectId] = useUrlFilter('project');
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const projects = useProjects({ page: 1, pageSize: PAGE_SIZE });
  const { data: tree, isLoading, isError, refetch } = useWbsTree(projectId);
  const selectedProject = (projects.data?.items ?? []).find((p) => p.id === projectId);

  const visibleTree = useMemo(() => filterTree(tree ?? [], query), [tree, query]);
  const selectedItem = useMemo(() => findItem(tree ?? [], selectedId), [tree, selectedId]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 text-neutral-950">Work Breakdown Structure</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Hierarchical scope per project, with progress and cost rollup.</p>
        </div>
        <div className="w-72">
          <Label htmlFor="project-select">Project</Label>
          <EntitySelect
            value={projectId}
            onValueChange={(v) => {
              setProjectId(v);
              setSelectedId(null);
              setShowForm(false);
            }}
            options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
            placeholder="Select project…"
            searchPlaceholder="Search project…"
          />
        </div>
      </header>

      {!projectId && (
        <div className="rounded-md border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="text-body-sm text-neutral-500">Select a project to view its WBS.</p>
        </div>
      )}

      {projectId && isLoading && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      )}

      {projectId && isError && <ErrorState message="Failed to load WBS." onRetry={() => refetch()} />}

      {projectId && !isLoading && !isError && tree && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search code or name…"
                  aria-label="Search WBS"
                  className="pl-8"
                />
              </div>
              <span className="text-caption text-neutral-500">
                {tree.length} root{tree.length === 1 ? '' : 's'}
              </span>
              <Button size="sm" className="ml-auto" onClick={() => { setParentId(undefined); setShowForm(true); }}>
                + Add root
              </Button>
            </div>

            {showForm && (
              <WbsForm
                projectId={projectId}
                parentId={parentId}
                projectCode={selectedProject?.code ?? ''}
                tree={tree}
                onDone={() => { setParentId(undefined); setShowForm(false); }}
              />
            )}

            <WbsTree
              tree={visibleTree}
              selectedId={selectedId}
              onSelect={(item) => setSelectedId(item.id)}
              onAddChild={(item) => { setParentId(item.id); setShowForm(true); }}
            />
          </div>

          <div className="min-w-0">
            {selectedItem ? (
              <WbsInspector key={selectedItem.id} projectId={projectId} item={selectedItem} onDeleted={() => setSelectedId(null)} />
            ) : (
              <div className="rounded-md border border-dashed border-neutral-300 bg-white p-6 text-center">
                <p className="text-body-sm text-neutral-500">Select a WBS item to view its detail.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function findItem(nodes: WbsItem[], id: string | null): WbsItem | undefined {
  if (!id) return undefined;
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findItem(node.children, id);
    if (found) return found;
  }
  return undefined;
}
