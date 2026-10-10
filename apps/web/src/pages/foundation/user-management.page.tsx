import { useState } from 'react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@aec/ui';
import { useUrlFilter } from '@/shared/lib/use-url-state';
import { useUsers, useUserStats } from '@/entities/user';
import { UserList, UserDetailPanel, UserForm } from '@/features/foundation/ui';
import type { User } from '@aec/api-contracts';

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

export function UserManagementPage() {
  const [search, setSearch] = useUrlFilter('q');
  const [status, setStatus] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [noRole, setNoRole] = useState(false);
  const [selected, setSelected] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const PAGE_SIZE = 20;
  const stats = useUserStats();
  const users = useUsers({ page: 1, pageSize: PAGE_SIZE, search: search || undefined, status: status || undefined, roleCode: roleCode || undefined, noRole });

  const items = users.data?.items ?? [];
  const closeForm = () => { setShowForm(false); setEditing(null); };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-neutral-950">User Management</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Who they are, and what they can do — identities, roles &amp; sessions</p>
        </div>
        <Button size="sm" onClick={() => (showForm ? closeForm() : setShowForm(true))}>{showForm ? 'Close' : '+ New user'}</Button>
      </header>

      {/* KPI strip */}
      <section aria-label="User summary" className="grid grid-cols-2 gap-x-8 gap-y-4 border-b border-neutral-200 pb-5 sm:grid-cols-5">
        <Kpi label="Users" value={stats.data?.total ?? '—'} context={stats.data ? `${stats.data.byRole.length} roles in use` : undefined} />
        <Kpi label="Active" value={stats.data?.active ?? '—'} />
        <Kpi label="Blocked" value={stats.data?.blocked ?? '—'} tone={stats.data && stats.data.blocked > 0 ? 'negative' : undefined} />
        <Kpi label="No role" value={stats.data?.noRole ?? '—'} tone={stats.data && stats.data.noRole > 0 ? 'warning' : undefined} context="need access" />
        <Kpi label="Active sessions" value={stats.data?.activeSessions ?? '—'} context="signed in now" />
      </section>

      {showForm || editing ? (
        <UserForm editing={editing} onDone={closeForm} />
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64 max-w-full">
          <Input type="search" aria-label="Search users" placeholder="Search name, username, email, job…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status || 'ALL'} onValueChange={(v) => setStatus(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-40" aria-label="Filter status"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {['ACTIVE', 'INVITED', 'INACTIVE', 'BLOCKED', 'SUSPENDED'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={roleCode || 'ALL'} onValueChange={(v) => setRoleCode(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-48" aria-label="Filter role"><SelectValue placeholder="All roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {(stats.data?.byRole ?? []).map((r) => <SelectItem key={r.code} value={r.code}>{r.name || r.code}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          type="button"
          aria-pressed={noRole}
          onClick={() => setNoRole((v) => !v)}
          className={`rounded-md border px-3 py-1.5 text-body-sm transition-colors ${noRole ? 'border-warning-400 bg-warning-50 text-warning-800' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}`}
        >
          No role only
        </button>
      </div>

      {/* Master–detail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="min-w-0 overflow-hidden rounded-md border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
            <span className="text-caption text-neutral-500">{users.data?.total ?? 0} users</span>
          </div>
          {users.isLoading ? (
            <div className="space-y-2 p-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : (
            <UserList users={items} selectedId={selected} onSelect={setSelected} />
          )}
        </div>

        <div className="min-w-0 rounded-md border border-neutral-200 bg-white">
          {selected ? (
            <UserDetailPanel userId={selected} onEdit={() => { const u = items.find((x) => x.id === selected); if (u) setEditing(u); }} />
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-body-sm text-neutral-500">Select a person to see who they are and what they can do.</p>
              <p className="text-caption text-neutral-400">Profile, roles, effective permissions, sessions and activity.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
