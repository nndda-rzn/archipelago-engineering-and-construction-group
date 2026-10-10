import { useMemo, useState } from 'react';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { cn, DataGrid, EmptyCell, Input } from '@aec/ui';
import type { ProjectCostSummaryItem } from '@aec/api-contracts';
import { Money } from '@/shared/ui/money';

const helper = createColumnHelper<ProjectCostSummaryItem>();

/** Ambang konsumsi budget — di atas 100% merah, di atas 90% kuning, sisanya netral. */
function usageTone(pct: number): string {
  if (pct > 100) return 'bg-destructive-600';
  if (pct > 90) return 'bg-warning-500';
  return 'bg-neutral-700';
}

/** Indikator pemakaian budget **di dalam sel** (bukan baris bilah terpisah). */
function BudgetUsageCell({ item }: { item: ProjectCostSummaryItem }) {
  const pct = item.budgetUsagePct;
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100">
        <span
          data-slot="budget-usage-fill"
          className={cn('block h-full rounded-full', usageTone(pct))}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </span>
      <span className={cn('w-10 text-right font-mono tabular-nums', pct > 100 ? 'text-destructive-600' : 'text-neutral-700')}>
        {pct}%
      </span>
    </div>
  );
}

const columns = [
  helper.accessor('projectCode', {
    header: 'Project',
    cell: ({ row }) => (
      <span>
        <span className="font-mono text-caption text-neutral-500">{row.original.projectCode}</span>{' '}
        <span className="text-neutral-800">{row.original.projectName}</span>
      </span>
    ),
  }),
  helper.accessor('contractValue', {
    header: 'Contract',
    meta: { align: 'right' as const, nowrap: true },
    cell: (info) => <Money value={info.getValue()} className="font-mono tabular-nums text-neutral-700" />,
  }),
  helper.accessor('budget', {
    header: 'Budget',
    meta: { align: 'right' as const, nowrap: true },
    cell: (info) => <Money value={info.getValue()} className="font-mono tabular-nums text-neutral-700" />,
  }),
  helper.accessor('cost', {
    header: 'Cost',
    meta: { align: 'right' as const, nowrap: true },
    cell: (info) => <Money value={info.getValue()} className="font-mono tabular-nums text-neutral-700" />,
  }),
  helper.accessor('revenue', {
    header: 'Revenue',
    meta: { align: 'right' as const, nowrap: true },
    cell: (info) => <Money value={info.getValue()} className="font-mono tabular-nums text-neutral-700" />,
  }),
  helper.accessor('margin', {
    header: 'Margin',
    meta: { align: 'right' as const, nowrap: true },
    cell: (info) => (
      <Money
        value={info.getValue()}
        className={cn('font-mono tabular-nums', info.getValue() >= 0 ? 'text-success-700' : 'text-destructive-600')}
      />
    ),
  }),
  helper.accessor('budgetUsagePct', {
    header: 'Budget used',
    meta: { align: 'right' as const },
    cell: ({ row }) => <BudgetUsageCell item={row.original} />,
  }),
];

/**
 * Ringkasan biaya per proyek sebagai `DataGrid`: dapat dicari, diurutkan per nilai
 * terbesar, dan dipaginasi. Indikator pemakaian budget kini **di dalam kolom**
 * (bukan deretan bilah terpisah di atas tabel) sehingga halaman jauh lebih pendek.
 */
export function ProjectCostTable({ items }: { items: ProjectCostSummaryItem[] }) {
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'budgetUsagePct', desc: true }]);

  // `DataGrid` memakai **manual sorting** ketika `onSortingChange` diberikan: ia
  // menampilkan UI urut di header tetapi mengharapkan data sudah tersortir. Jadi
  // kita urutkan sendiri di sini (kolom numerik + nama proyek).
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? items.filter((p) => p.projectCode.toLowerCase().includes(q) || p.projectName.toLowerCase().includes(q))
      : items.slice();

    const sort = sorting[0];
    if (!sort) return filtered;
    const dir = sort.desc ? -1 : 1;
    const numeric = sort.id !== 'projectCode';
    return filtered.sort((a, b) => {
      if (numeric) {
        const av = Number(a[sort.id as keyof ProjectCostSummaryItem] ?? 0);
        const bv = Number(b[sort.id as keyof ProjectCostSummaryItem] ?? 0);
        return (av - bv) * dir;
      }
      return a.projectCode.localeCompare(b.projectCode) * dir;
    });
  }, [items, search, sorting]);

  if (items.length === 0) {
    return <EmptyCell />;
  }

  return (
    <div className="mt-1 flex flex-col gap-3">
      <div className="w-64 max-w-full">
        <Input
          type="search"
          placeholder="Search project code or name…"
          aria-label="Search projects"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="rounded-md border border-neutral-200">
        <DataGrid
          columns={columns}
          data={rows}
          sorting={sorting}
          onSortingChange={setSorting}
          clientPagination
          pageSize={8}
          emptyMessage="No projects match this search"
        />
      </div>
    </div>
  );
}
