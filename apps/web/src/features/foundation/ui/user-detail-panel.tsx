import { useState } from 'react';
import { Button, ConfirmActionButton, EmptyState, ErrorState, PersonAvatar, Skeleton, StatusBadge, humanizeCode, labelRole } from '@aec/ui';
import { useUserDetail, useRevokeRole, useResetPassword, useForceLogout, useRevokeSession } from '@/entities/user';
import { PermissionMatrix } from './permission-matrix';

type Tab = 'overview' | 'access' | 'sessions' | 'activity';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'access', label: 'Access' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'activity', label: 'Activity' },
];

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-overline uppercase text-neutral-500">{label}</dt>
      <dd className="mt-0.5 truncate text-body-sm text-neutral-800" title={typeof value === 'string' ? value : undefined}>{value}</dd>
    </div>
  );
}

/**
 * Panel detail user (master–detail). Tab: Overview (siapa), Access (sebagai apa),
 * Sessions (perangkat aktif), Activity (riwayat). Bukan tabel datar.
 */
export function UserDetailPanel({ userId, onEdit }: { userId: string; onEdit: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const { data, isLoading, isError, refetch } = useUserDetail(userId);
  const revokeRole = useRevokeRole();
  const resetPassword = useResetPassword();
  const forceLogout = useForceLogout();
  const revokeSession = useRevokeSession();

  if (isLoading) {
    return <div className="space-y-3 p-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }
  if (isError || !data) {
    return <div className="p-4"><ErrorState message="Could not load this user." onRetry={() => refetch()} /></div>;
  }

  const { user } = data;

  return (
    <div className="flex flex-col">
      {/* Identity band — header orang, bukan kartu */}
      <header className="flex items-start gap-4 border-b border-neutral-200 px-4 py-4">
        <PersonAvatar name={user.displayName} size="lg" className="h-12 w-12 text-h3" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-h2 text-neutral-950" title={user.displayName}>{user.displayName}</h2>
            <StatusBadge status={user.status} />
            {data.roles.length === 0 && <span className="rounded border border-dashed border-warning-300 px-1.5 py-px text-caption text-warning-700">No role</span>}
          </div>
          <p className="mt-0.5 truncate text-body-sm text-neutral-600" title={user.email}>{user.email}</p>
          <p className="mt-0.5 text-caption text-neutral-500">
            {[user.jobTitle, user.department, user.legalEntity?.legalName, user.organization?.name].filter(Boolean).join(' · ') || 'No placement details'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
          <ConfirmActionButton
            size="sm" variant="secondary"
            confirmTitle={`Force logout ${user.displayName}?`}
            confirmDescription="All active sessions will be revoked immediately."
            confirmLabel="Force logout"
            onConfirm={() => forceLogout.mutate(user.id)}
          >
            Force logout
          </ConfirmActionButton>
          <ConfirmActionButton
            size="sm" variant="secondary"
            confirmTitle={`Reset password for ${user.displayName}?`}
            confirmDescription="A temporary password is generated and all sessions are revoked."
            confirmLabel="Reset password"
            onConfirm={() => resetPassword.mutate({ id: user.id })}
          >
            Reset password
          </ConfirmActionButton>
        </div>
      </header>

      {/* Tab bar semantik */}
      <div role="tablist" aria-label="User detail sections" className="flex items-center gap-1 border-b border-neutral-200 px-4">
        {TABS.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id} type="button" role="tab" aria-selected={selected} tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-body-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/40 ${
                selected ? 'border-neutral-800 text-neutral-950' : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {tab === 'overview' && (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Field label="Username" value={`@${user.username}`} />
              <Field label="Phone" value={user.phone ?? '—'} />
              <Field label="Entity" value={user.legalEntity?.legalName ?? '—'} />
              <Field label="Organization" value={user.organization?.name ?? '—'} />
              <Field label="Department" value={user.department ?? '—'} />
              <Field label="Joined" value={fmt(user.createdAt)} />
              <Field label="Last sign-in" value={fmt(user.lastLoginAt)} />
              <Field label="Employee" value={data.user.employee ? `${data.user.employee.employeeNumber} · ${data.user.employee.position}` : '—'} />
            </dl>
            {user.blockedAt && (
              <p className="rounded-md border border-destructive-200 bg-destructive-50 px-3 py-2 text-body-sm text-destructive-700">
                Blocked {fmt(user.blockedAt)}{user.blockedReason ? ` — ${user.blockedReason}` : ''}
              </p>
            )}
          </div>
        )}

        {tab === 'access' && (
          <div className="flex flex-col gap-5">
            <section aria-label="Roles">
              <h3 className="mb-2 text-h3 text-neutral-900">Roles</h3>
              {data.roles.length === 0 ? (
                <EmptyState title="No roles assigned" description="This user has no access. Assign a role to grant permissions." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.roles.map((r) => (
                    <li key={r.code} className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-medium text-neutral-900">{labelRole(r.code)}</p>
                        <p className="text-caption text-neutral-500">
                          <span className="font-mono">{r.code}</span> · since {fmt(r.effectiveFrom)}{r.effectiveTo ? ` → ${fmt(r.effectiveTo)}` : ''}
                        </p>
                      </div>
                      <ConfirmActionButton
                        size="sm" variant="ghost"
                        confirmTitle={`Revoke ${labelRole(r.code)}?`}
                        confirmDescription="The user loses the permissions this role grants."
                        confirmLabel="Revoke"
                        onConfirm={() => revokeRole.mutate({ id: user.id, roleCode: r.code })}
                      >
                        Revoke
                      </ConfirmActionButton>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="Effective permissions">
              <h3 className="mb-2 text-h3 text-neutral-900">Effective permissions</h3>
              <PermissionMatrix permissions={data.permissions} allPermissions={data.permissions} />
            </section>
          </div>
        )}

        {tab === 'sessions' && (
          <div className="flex flex-col gap-4">
            <section aria-label="Active sessions">
              <h3 className="mb-2 text-h3 text-neutral-900">Sessions</h3>
              {data.sessions.length === 0 ? (
                <p className="text-body-sm text-neutral-500">No sessions recorded.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.sessions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-body-sm text-neutral-800">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${s.status === 'ACTIVE' ? 'bg-success-600' : 'bg-neutral-300'}`} aria-hidden="true" />
                          {s.status} · <span className="font-mono text-caption">{s.ipAddress ?? 'unknown IP'}</span>
                        </p>
                        <p className="truncate text-caption text-neutral-500" title={s.userAgent ?? undefined}>{s.userAgent ?? 'Unknown device'}</p>
                        <p className="text-caption text-neutral-400">Started {fmt(s.createdAt)} · expires {fmt(s.expiresAt)}</p>
                      </div>
                      {s.status === 'ACTIVE' && (
                        <Button size="sm" variant="ghost" onClick={() => revokeSession.mutate({ id: user.id, sessionId: s.id })}>Revoke</Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="Recent sign-ins">
              <h3 className="mb-2 text-h3 text-neutral-900">Recent sign-ins</h3>
              {data.recentLogins.length === 0 ? (
                <p className="text-body-sm text-neutral-500">No sign-in history.</p>
              ) : (
                <ol className="flex flex-col gap-1.5">
                  {data.recentLogins.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 text-body-sm">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${l.type === 'SUCCESS' ? 'bg-success-600' : 'bg-destructive-500'}`} aria-hidden="true" />
                      <span className="w-40 shrink-0 text-caption text-neutral-500">{fmt(l.at)}</span>
                      <span className={l.type === 'SUCCESS' ? 'text-neutral-700' : 'text-destructive-600'}>{l.type.replace(/_/g, ' ').toLowerCase()}</span>
                      <span className="ml-auto font-mono text-caption text-neutral-400">{l.ipAddress ?? '—'}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}

        {tab === 'activity' && (
          <section aria-label="Activity">
            {data.activity.length === 0 ? (
              <p className="text-body-sm text-neutral-500">No activity recorded yet.</p>
            ) : (
              <ol className="relative flex flex-col gap-4 border-l border-neutral-200 pl-4">
                {data.activity.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-neutral-400" aria-hidden="true" />
                    <p className="text-body-sm text-neutral-800">{a.summary}</p>
                    <p className="text-caption text-neutral-500">{humanizeCode(a.action)} · {fmt(a.at)}</p>
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
