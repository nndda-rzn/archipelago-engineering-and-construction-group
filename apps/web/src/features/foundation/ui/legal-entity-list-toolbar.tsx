import { useEffect, useState } from 'react';
import { Button, Input, SegmentedControl } from '@aec/ui';
import { useUrlFilter } from '@/shared/lib/use-url-state';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export interface LegalEntityListToolbarViewProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  onAdd: () => void;
}

/** Toolbar daftar: pencarian + filter status + satu aksi utama. */
export function LegalEntityListToolbarView({ search, onSearchChange, status, onStatusChange, onAdd }: LegalEntityListToolbarViewProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        type="search"
        aria-label="Search legal entities"
        placeholder="Search code, name or tax ID…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
      />
      <SegmentedControl aria-label="Status" options={STATUS_OPTIONS} value={status} onValueChange={onStatusChange} />
      <div className="ml-auto">
        <Button size="sm" onClick={onAdd}>
          + Add entity
        </Button>
      </div>
    </div>
  );
}

/** State filter daftar yang hidup di URL (dapat dibagikan). */
export function useLegalEntityListFilters(): {
  search: string;
  status: string;
  setSearch: (value: string) => void;
  setStatus: (value: string) => void;
} {
  const [search, setSearch] = useUrlFilter('q');
  const [status, setStatus] = useUrlFilter('status');
  return { search, status, setSearch, setStatus };
}

/**
 * Toolbar terhubung: debounce pencarian ~300ms agar tiap ketikan tidak memicu
 * query. Nilai yang tampil segera; URL diperbarui setelah jeda.
 */
export function LegalEntityListToolbar({ onAdd }: { onAdd: () => void }) {
  const { search, status, setSearch, setStatus } = useLegalEntityListFilters();
  const [local, setLocal] = useState(search);

  useEffect(() => {
    setLocal(search);
  }, [search]);

  useEffect(() => {
    if (local === search) return;
    const t = setTimeout(() => setSearch(local), 300);
    return () => clearTimeout(t);
  }, [local, search, setSearch]);

  return (
    <LegalEntityListToolbarView
      search={local}
      onSearchChange={setLocal}
      status={status}
      onStatusChange={setStatus}
      onAdd={onAdd}
    />
  );
}
