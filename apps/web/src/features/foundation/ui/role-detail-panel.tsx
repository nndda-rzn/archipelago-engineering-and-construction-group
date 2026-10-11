import { useMemo, useState } from 'react';
import { Lock, Users } from 'lucide-react';
import type { RoleDetail } from '@aec/api-contracts';
import {
  Button, ConfirmActionButton, EmptyState, ErrorState, PersonAvatar, Skeleton, StatusBadge,
  humanizeCode, useToast,
} from '@aec/ui';
import { useRoleDetail, useAssignPermissions, useAddRoleMember, useRemoveRoleMember, usePermissionCatalog } from '@/entities/role';
import { useUsers } from '@/entities/user';
import { PermissionGrid } from './permission-grid';

type Tab = 'overview' | 'permissions' | 'members' | 'activity';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'members', label: 'Members' },
  { id: 'activity', label: 'Activity' },
];

const CATEGORY_LABEL: Record<string, string> = {
  SYSTEM: 'System', FUNCTIONAL: 'Functional', PROJECT: 'Project', CUSTOM: 'Custom',
};

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—';
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-overline uppercase text-neutral-500">{label}</dt>
      <dd className="mt-0.5 truncate text-body-sm text-neutral-800" title={typeof value === 'string' ? value : undefined}>{value}</dd>
    </div>
  );
}

/** Panel detail role (master–detail). Tab: Overview · Permissions · Members · Activity. */
export function RoleDetailPanel({ roleId, onEdit, onDelete }: { roleId: string; onEdit: (role: RoleDetail['role']) => void; onDelete: (role: RoleDetail['role']) => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const toast = useToast();
  const { data, isLoading, isError, refetch } = useRoleDetail(roleId);
  const assign = useAssignPermissions();
  const addMember = useAddRoleMember();
  const removeMember = useRemoveRoleMember();
  const users = useUsers({ page: 1, pageSize: 200 });
  const catalog = usePermissionCatalog();

  // Draf izin lokal — dibandingkan dengan data server untuk menghitung diff.
  const serverCodes = useMemo(() => (data?.permissions ?? []).map((p) => p.code).sort(), [data]);
  const [selected, setSelected] = useState<string[]>(serverCodes);
  const [addUserId, setAddUserId] = useState('');
  const [syncedFrom, setSyncedFrom] = useState(serverCodes);

  // Sinkronkan draf saat data server berubah (mis. setelah Save) — pola
  // "derived state" React, bukan setState di dalam efek.
  if (syncedFrom !== serverCodes) {
    setSyncedFrom(serverCodes);
    setSelected(serverCodes);
  }

  if (isLoading) {
    return <div className="space-y-3 p-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }
  if (isError || !data) {
    return <div className="p-4"><ErrorState message="Could not load this role." onRetry={() => refetch()} /></div>;
  }

  const { role, members, activity } = data;
  const added = selected.filter((c) => !serverCodes.includes(c));
  const removed = serverCodes.filter((c) => !selected.includes(c));
  const dirty = added.length > 0 || removed.length > 0;

  const memberIds = new Set(members.map((m) => m.userId));
  const candidates = (users.data?.items ?? []).filter((u) => !memberIds.has(u.id));

  return (
    <div className="flex flex-col">
      {/* Identity band */}
      <header className="flex items-start gap-4 border-b border-neutral-200 px-4 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-h2 text-neutral-950" title={role.name}>{role.name}</h2>
            <StatusBadge status={role.status} />
            <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-px text-caption text-neutral-600">{CATEGORY_LABEL[role.category] ?? role.category}</span>
            {role.isSystem && (
              <span className="inline-flex items-center gap-1 rounded border border-neutral-300 px-1.5 py-px text-caption text-neutral-500">
                <Lock className="h-3 w-3" aria-hidden="true" /> system
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-body-sm text-neutral-500">{role.code}</p>
          {role.description && <p className="mt-1 max-w-[65ch] text-body-sm text-neutral-600">{role.description}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onEdit(role)}>Edit</Button>
          {!role.isSystem && (
            <ConfirmActionButton
              size="sm" variant="ghost"
              confirmTitle={`Delete ${role.name}?`}
              confirmDescription="This cannot be undone. Roles that still have active members cannot be deleted."
              confirmLabel="Delete role"
              onConfirm={() => onDelete(role)}
            >
              Delete
            </ConfirmActionButton>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <div role="tablist" aria-label="Role detail sections" className="flex items-center gap-1 border-b border-neutral-200 px-4">
        {TABS.map((t) => {
          const isSel = t.id === tab;
          const badge = t.id === 'permissions' ? data.permissions.length : t.id === 'members' ? members.length : null;
          return (
            <button
              key={t.id} type="button" role="tab" aria-selected={isSel} tabIndex={isSel ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-body-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/40 ${
                isSel ? 'border-neutral-800 text-neutral-950' : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {t.label}
              {badge !== null && <span className="font-mono text-caption tabular-nums text-neutral-400">{badge}</span>}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {tab === 'overview' && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label="Code" value={role.code} />
            <Field label="Category" value={CATEGORY_LABEL[role.category] ?? role.category} />
            <Field label="Status" value={role.status} />
            <Field label="Assignable" value={role.isAssignable ? 'Yes' : 'No'} />
            <Field label="Permissions" value={`${data.permissions.length} granted`} />
            <Field label="Members" value={`${members.length} holder(s)`} />
            <Field label="Created" value={fmt(role.createdAt)} />
            <Field label="Updated" value={fmt(role.updatedAt)} />
            <Field label="Scope" value="Global" />
          </dl>
        )}

        {tab === 'permissions' && (
          <div className="flex flex-col gap-4">
            {catalog.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <PermissionGrid catalog={catalog.data ?? []} value={selected} onChange={setSelected} disabled={assign.isPending} />
            )}
            {dirty && (
              <div className="sticky bottom-0 flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-xs">
                <span className="text-body-sm text-neutral-700">
                  <span className="font-mono tabular-nums text-success-700">+{added.length}</span>
                  {' · '}
                  <span className="font-mono tabular-nums text-destructive-600">−{removed.length}</span>
                  {' '}pending change(s)
                </span>
                <div className="ml-auto flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(serverCodes)}>Reset</Button>
                  <Button
                    size="sm" loading={assign.isPending}
                    onClick={() => assign.mutate({ id: role.id, permissionCodes: selected }, {
                      onSuccess: (res) => toast({ title: 'Permissions saved', description: `+${res.added.length} / −${res.removed.length}`, variant: 'success' }),
                      onError: () => toast({ title: 'Could not save permissions', variant: 'error' }),
                    })}
                  >
                    Save changes
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="flex flex-col gap-4">
            <section aria-label="Members">
              <h3 className="mb-2 flex items-center gap-2 text-h3 text-neutral-900">
                <Users className="h-4 w-4 text-neutral-400" aria-hidden="true" /> Who holds this role
              </h3>
              {members.length === 0 ? (
                <EmptyState title="No members" description="No one holds this role yet — it grants access to nobody." />
              ) : (
                <ul className="flex flex-col divide-y divide-neutral-100">
                  {members.map((m) => (
                    <li key={m.userId} className="flex items-center gap-3 py-2">
                      <PersonAvatar name={m.displayName} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-medium text-neutral-900" title={m.displayName}>{m.displayName}</p>
                        <p className="truncate text-caption text-neutral-500">
                          {[m.jobTitle, m.legalEntityName].filter(Boolean).join(' · ') || m.email}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-caption text-neutral-400">
                        <p>since {fmt(m.effectiveFrom)}</p>
                        {m.effectiveTo && <p>until {fmt(m.effectiveTo)}</p>}
                      </div>
                      <ConfirmActionButton
                        size="sm" variant="ghost"
                        confirmTitle={`Remove ${m.displayName} from ${role.name}?`}
                        confirmDescription="The user loses the permissions this role grants."
                        confirmLabel="Remove"
                        onConfirm={() => removeMember.mutate({ id: role.id, userId: m.userId }, {
                          onSuccess: () => toast({ title: `${m.displayName} removed`, variant: 'success' }),
                        })}
                      >
                        Remove
                      </ConfirmActionButton>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="Add member" className="rounded-md border border-neutral-200 p-3">
              <h3 className="mb-2 text-h3 text-neutral-900">Add a member</h3>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Select user to add"
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  className="h-9 min-w-56 rounded-md border border-neutral-200 bg-white px-2 text-body-sm text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/40"
                >
                  <option value="">Select a user…</option>
                  {candidates.map((u) => (
                    <option key={u.id} value={u.id}>{u.displayName} — {u.jobTitle ?? u.email}</option>
                  ))}
                </select>
                <Button
                  size="sm" disabled={!addUserId || addMember.isPending} loading={addMember.isPending}
                  onClick={() => addMember.mutate({ id: role.id, userId: addUserId, reason: 'Assigned from role workspace' }, {
                    onSuccess: () => { setAddUserId(''); toast({ title: 'Member added', variant: 'success' }); },
                    onError: () => toast({ title: 'Could not add member', variant: 'error' }),
                  })}
                >
                  Add to role
                </Button>
              </div>
            </section>
          </div>
        )}

        {tab === 'activity' && (
          <section aria-label="Activity">
            {activity.length === 0 ? (
              <p className="text-body-sm text-neutral-500">No activity recorded yet.</p>
            ) : (
              <ol className="relative flex flex-col gap-4 border-l border-neutral-200 pl-4">
                {activity.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-neutral-400" aria-hidden="true" />
                    <p className="text-body-sm text-neutral-800">{a.summary}</p>
                    <p className="text-caption text-neutral-500">{humanizeCode(a.action)} · {new Date(a.at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
