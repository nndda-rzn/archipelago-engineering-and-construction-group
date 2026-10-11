import { useMemo, useState } from 'react';
import type { Role } from '@aec/api-contracts';
import { Button, Input, Skeleton, useToast } from '@aec/ui';
import { useDeleteRole, useRoles, useRoleStats } from '@/entities/role';
import { RoleList, RoleDetailPanel, RoleForm } from '@/features/foundation/ui';

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

export function RoleManagementPage() {
  const toast = useToast();
  const stats = useRoleStats();
  const roles = useRoles();
  const remove = useDeleteRole();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);

  const all = useMemo(() => roles.data ?? [], [roles.data]);
  const permissionTotal = useMemo(() => Math.max(0, ...all.map((r) => r.permissionCount)), [all]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }, [all, search]);

  const closeForm = () => { setShowForm(false); setEditing(null); };
  const onDelete = (role: Role) => {
    remove.mutate(role.id, {
      onSuccess: () => { setSelected(''); toast({ title: `${role.name} deleted`, variant: 'success' }); },
      onError: () => toast({ title: 'Could not delete role', description: 'Roles with active members cannot be deleted.', variant: 'error' }),
    });
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-neutral-950">Role Management</h1>
          <p className="mt-1 text-body-sm text-neutral-500">What each role is, what it can do, and who holds it</p>
        </div>
        <Button size="sm" onClick={() => (showForm ? closeForm() : setShowForm(true))}>{showForm ? 'Close' : '+ New role'}</Button>
      </header>

      {/* KPI strip */}
      <section aria-label="Role summary" className="grid grid-cols-2 gap-x-8 gap-y-4 border-b border-neutral-200 pb-5 sm:grid-cols-5">
        <Kpi label="Roles" value={stats.data?.total ?? '—'} />
        <Kpi label="Active" value={stats.data?.active ?? '—'} />
        <Kpi label="Empty" value={stats.data?.emptyRoles ?? '—'} tone={stats.data && stats.data.emptyRoles > 0 ? 'warning' : undefined} context="0 permissions" />
        <Kpi label="Unused" value={stats.data?.unusedRoles ?? '—'} tone={stats.data && stats.data.unusedRoles > 0 ? 'warning' : undefined} context="no members" />
        <Kpi label="Assignments" value={stats.data?.assignments ?? '—'} context="role grants" />
      </section>

      {(showForm || editing) && <RoleForm editing={editing} onDone={closeForm} />}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72 max-w-full">
          <Input type="search" aria-label="Search roles" placeholder="Search name, code or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="text-caption text-neutral-500">{filtered.length} of {all.length} roles</span>
      </div>

      {/* Master–detail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="min-w-0 overflow-hidden rounded-md border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
            <span className="text-caption text-neutral-500">Roles</span>
            <span className="font-mono text-caption tabular-nums text-neutral-400">{all.length}</span>
          </div>
          {roles.isLoading ? (
            <div className="space-y-2 p-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
          ) : (
            <RoleList roles={filtered} selectedId={selected} onSelect={setSelected} permissionTotal={permissionTotal} />
          )}
        </div>

        <div className="min-w-0 rounded-md border border-neutral-200 bg-white">
          {selected ? (
            <RoleDetailPanel roleId={selected} onEdit={(role) => setEditing(role)} onDelete={onDelete} />
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-body-sm text-neutral-500">Select a role to see what it can do and who holds it.</p>
              <p className="text-caption text-neutral-400">Overview, an editable permission matrix, members and activity.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
