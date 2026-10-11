import { useMemo, useState } from 'react';
import { Button, EmptyState, FilterChip, Input, Label, SegmentedControl, Skeleton } from '@aec/ui';
import { useProjectRegister, useProjectStats } from '@/entities/project';
import { ProjectForm } from '@/features/project/ui';
import { ProjectCardView, ProjectTableView, ProjectTimelineView, type RegisterRow } from '@/features/project/ui/project-views';
import { useUrlFilter } from '@/shared/lib/use-url-state';
import { formatIdr } from '@/shared/lib/format';

const VIEW_OPTIONS = [
  { value: 'tabel', label: 'Tabel' },
  { value: 'kartu', label: 'Kartu' },
  { value: 'timeline', label: 'Timeline' },
];

const STATUS_OPTIONS = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED'];
const STATUS_LABEL: Record<string, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
};

/** KPI tanpa bingkai kartu — angka = angka, dengan label & konteks. */
function Kpi({ label, value, context, tone }: { label: string; value: React.ReactNode; context?: string; tone?: 'negative' | 'warning' }) {
  const toneClass = tone === 'negative' ? 'text-destructive-600' : tone === 'warning' ? 'text-warning-700' : 'text-neutral-950';
  return (
    <div className="min-w-0">
      <p className="text-overline uppercase text-neutral-500">{label}</p>
      <p className={`mt-0.5 font-mono tabular-nums text-h1 ${toneClass}`}>{value}</p>
      {context && <p className="text-caption text-neutral-500">{context}</p>}
    </div>
  );
}

/**
 * Ringkasan portofolio dari register. Label "within budget" / "at 90%+" sengaja
 * eksplisit: `health` mengukur SERAPAN BIAYA, bukan risiko jadwal.
 */
export function PortfolioSummary({ totals, healthCounts }: {
  totals: { projectCount: number; totalContract: number };
  healthCounts: { NO_BUDGET: number; ON_TRACK: number; AT_RISK: number; CRITICAL: number };
}) {
  const withinBudget = healthCounts.ON_TRACK;
  const at90 = healthCounts.CRITICAL;
  return (
    <p className="text-body-sm text-neutral-500">
      <span className="font-medium text-neutral-800">{totals.projectCount} projects</span>
      {' · '}
      {formatIdr(totals.totalContract)} contracted
      {' · '}
      {withinBudget} within budget
      {' · '}
      {at90} at 90%+
    </p>
  );
}

/** Filter klien: saring register memakai predicate murni (mudah diuji). */
export function filterRows(items: RegisterRow[], opts: { status?: string; query?: string }): RegisterRow[] {
  const q = (opts.query ?? '').trim().toLowerCase();
  return items.filter((p) => {
    if (opts.status && p.status !== opts.status) return false;
    if (!q) return true;
    return `${p.code} ${p.name} ${p.client}`.toLowerCase().includes(q);
  });
}

export function ProjectListPage() {
  const [view, setView] = useUrlFilter('view', 'tabel');
  const [status, setStatus] = useUrlFilter('status');
  const [query, setQuery] = useUrlFilter('q');
  const [showForm, setShowForm] = useState(false);
  // Jam dibaca sekali saat mount (pola React untuk "waktu sekarang"), bukan saat render.
  const [now] = useState(() => Date.now());

  const { data, isLoading, isError, refetch } = useProjectRegister();
  const stats = useProjectStats();

  const rows = useMemo(() => filterRows((data?.items ?? []) as RegisterRow[], { status, query }), [data, status, query]);
  const hasFilter = Boolean(status || query);
  const hasAnyProject = (data?.items.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-neutral-950">Projects</h1>
          {data && <div className="mt-1"><PortfolioSummary totals={data.totals} healthCounts={data.healthCounts} /></div>}
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ New project'}</Button>
      </div>

      {/* KPI strip */}
      <section aria-label="Project summary" className="grid grid-cols-2 gap-x-8 gap-y-4 border-b border-neutral-200 pb-4 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Projects" value={stats.data?.total ?? '—'} />
        <Kpi label="Active" value={stats.data?.active ?? '—'} />
        <Kpi label="On hold" value={stats.data?.onHold ?? '—'} tone={stats.data && stats.data.onHold > 0 ? 'warning' : undefined} />
        <Kpi label="Completed" value={stats.data?.completed ?? '—'} />
        <Kpi label="Critical" value={stats.data?.critical ?? '—'} tone={stats.data && stats.data.critical > 0 ? 'negative' : undefined} />
        <Kpi label="No team" value={stats.data?.withoutTeam ?? '—'} tone={stats.data && stats.data.withoutTeam > 0 ? 'warning' : undefined} context="nobody assigned" />
      </section>

      {showForm && <ProjectForm onDone={() => setShowForm(false)} />}

      {/* Toolbar: filter + search + pemilih view (semua tersimpan di URL). */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 pb-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Label htmlFor="project-search">Search</Label>
            <Input
              id="project-search"
              type="search"
              placeholder="Code, name, client…"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pb-1">
            <button
              type="button"
              aria-pressed={!status}
              onClick={() => setStatus('')}
              className={`rounded px-2 py-0.5 text-caption transition-colors duration-fast ${!status ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              All
            </button>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(status === s ? '' : s)}
                className={`rounded px-2 py-0.5 text-caption transition-colors duration-fast ${status === s ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <SegmentedControl aria-label="Project view" options={VIEW_OPTIONS} value={view} onValueChange={setView} />
      </div>

      {hasFilter && (
        <div className="flex flex-wrap items-center gap-2">
          {status && <FilterChip label={STATUS_LABEL[status] ?? status} onRemove={() => setStatus('')} />}
          {query && <FilterChip label={`“${query}”`} onRemove={() => setQuery('')} />}
          <button type="button" className="text-caption text-neutral-500 underline hover:text-neutral-800" onClick={() => { setStatus(''); setQuery(''); }}>
            Clear filters
          </button>
        </div>
      )}

      {isLoading && (
        <div aria-label="Loading projects" className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      )}

      {!isLoading && isError && (
        <EmptyState
          title="Could not load projects"
          description="Check your connection and try again."
          action={<Button size="sm" variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      )}

      {!isLoading && !isError && rows.length === 0 && (
        // Dua keadaan dibedakan: belum ada data (ajak membuat) vs filter kosong (ajak reset).
        hasAnyProject ? (
          <EmptyState
            title="No projects match"
            description="Your filter returned nothing. Clear it to see all projects."
            action={<Button size="sm" variant="secondary" onClick={() => { setStatus(''); setQuery(''); }}>Clear filters</Button>}
          />
        ) : (
          <EmptyState
            title="No projects yet"
            description="Projects hold budget, WBS, and health. Create the first one to get started."
            action={<Button size="sm" onClick={() => setShowForm(true)}>+ New project</Button>}
          />
        )
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <>
          <p className="text-caption text-neutral-500">Showing {rows.length} of {data?.items.length ?? 0}</p>
          {view === 'kartu' ? (
            <ProjectCardView items={rows} />
          ) : view === 'timeline' ? (
            <ProjectTimelineView items={rows} now={now} />
          ) : (
            <ProjectTableView items={rows} />
          )}
        </>
      )}
    </div>
  );
}
