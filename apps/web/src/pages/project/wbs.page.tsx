import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button, EmptyState, EntityAvatar, ErrorState, ICON_SIZE, ICON_STROKE, Input, Skeleton, StatusBadge, cn } from '@aec/ui';
import type { WbsItem } from '@aec/api-contracts';
import { useWbsTree } from '@/entities/wbs';
import { useProjects } from '@/entities/project';
import { WbsForm, WbsInspector, WbsTree } from '@/features/project/ui';
import { ProjectPicker } from '@/features/project/ui/project-picker';
import { WbsSummaryStrip } from '@/features/project/ui/wbs-summary-strip';
import { useUrlFilter } from '@/shared/lib/use-url-state';
import { formatIdr } from '@/shared/lib/format';
import { PAGE_SIZE } from '@/shared/lib/pagination';

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

function findItem(nodes: WbsItem[], id: string | null): WbsItem | undefined {
  if (!id) return undefined;
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findItem(node.children, id);
    if (found) return found;
  }
  return undefined;
}

const fmtDate = (d: string | null | undefined) => (d ? d.slice(0, 10) : '—');

export function WbsPage() {
  const [projectId, setProjectId] = useUrlFilter('project');
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const projects = useProjects({ page: 1, pageSize: PAGE_SIZE });
  const { data: tree, isLoading, isError, refetch } = useWbsTree(projectId);
  const project = (projects.data?.items ?? []).find((p) => p.id === projectId);

  const visibleTree = useMemo(() => filterTree(tree ?? [], query), [tree, query]);
  const selectedItem = useMemo(() => findItem(tree ?? [], selectedId), [tree, selectedId]);

  const selectProject = (v: string) => {
    setProjectId(v);
    setSelectedId(null);
    setShowForm(false);
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      {/* Identity band: konteks proyek yang sedang dibuka. */}
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {project && <EntityAvatar name={project.name} size="lg" />}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-h1 text-neutral-950">Work Breakdown Structure</h1>
                {project && <StatusBadge status={project.status} />}
                {project && (
                  <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-px text-caption text-neutral-600">
                    {project.type}
                  </span>
                )}
              </div>
              {project ? (
                <p className="mt-1 text-body-sm text-neutral-500">
                  <span className="font-mono">{project.code}</span> · {project.name} · {project.client}
                </p>
              ) : (
                <p className="mt-1 text-body-sm text-neutral-500">Hierarchical scope per project, with progress and cost rollup.</p>
              )}
            </div>
          </div>
          <div className="w-80 max-w-full">
            <ProjectPicker value={projectId} onValueChange={selectProject} />
          </div>
        </div>

        {project && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-overline uppercase text-neutral-500">Contract value</dt>
              <dd className="mt-0.5 truncate font-mono text-body-sm tabular-nums text-neutral-800" title={formatIdr(project.contractValue ?? 0)}>
                {formatIdr(project.contractValue ?? 0)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-overline uppercase text-neutral-500">Schedule</dt>
              <dd className="mt-0.5 truncate font-mono text-body-sm tabular-nums text-neutral-800">
                {fmtDate(project.startDate)} → {fmtDate(project.completionDate)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-overline uppercase text-neutral-500">Location</dt>
              <dd className="mt-0.5 truncate text-body-sm text-neutral-800">{project.location ?? '—'}</dd>
            </div>
          </dl>
        )}
      </header>

      {!projectId && (
        <EmptyState
          title="Select a project"
          description="Pick a project to view and manage its work breakdown structure."
          icon={<Search size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} aria-hidden="true" />}
        />
      )}

      {projectId && isLoading && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {projectId && isError && <ErrorState message="Failed to load WBS." onRetry={() => refetch()} />}

      {projectId && !isLoading && !isError && tree && (
        <>
          <WbsSummaryStrip tree={tree} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
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
                <span className={cn('text-caption text-neutral-500', query && 'text-neutral-700')}>
                  {query ? `${visibleTree.length} of ${tree.length} branches` : `${tree.length} branch${tree.length === 1 ? '' : 'es'}`}
                </span>
                <Button size="sm" className="ml-auto" onClick={() => { setParentId(undefined); setShowForm(true); }}>
                  + Add root
                </Button>
              </div>

              {showForm && (
                <WbsForm
                  projectId={projectId}
                  parentId={parentId}
                  projectCode={project?.code ?? ''}
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
                <div className="rounded-md border border-neutral-200 bg-surface-raised p-6 shadow-xs">
                  <p className="text-center text-body-sm text-neutral-500">Select a WBS item to view its detail.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
