import { PersonAvatar, StatusBadge, EmptyState } from '@aec/ui';
import { labelRole } from '@aec/ui';
import type { User } from '@aec/api-contracts';

/** Warna chip role — memakai palet aman buta warna. */
const ROLE_TONE: Record<string, string> = {
  SUPER_ADMIN: 'bg-racing-red-50 text-racing-red-700 border-racing-red-200',
  PROCUREMENT_MANAGER: 'bg-warning-50 text-warning-700 border-warning-200',
  BUYER: 'bg-info-50 text-info-700 border-info-200',
};

function relativeTime(iso: string | null): string {
  if (!iso) return 'never signed in';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export interface UserListProps {
  users: User[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Daftar orang (bukan tabel): avatar, nama + jabatan, chip role, status, dan
 * "terakhir masuk". `role="listbox"`/`option` agar pilihan terbaca screen reader.
 */
export function UserList({ users, selectedId, onSelect }: UserListProps) {
  if (users.length === 0) {
    return <EmptyState title="No users" description="No users match the current filters." />;
  }
  return (
    <ul role="listbox" aria-label="Users" className="divide-y divide-neutral-100">
      {users.map((u) => {
        const selected = u.id === selectedId;
        return (
          <li key={u.id}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(u.id)}
              className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-racing-red-600 ${
                selected ? 'bg-racing-red-50' : 'hover:bg-neutral-50'
              }`}
            >
              <span className="relative mt-0.5">
                <PersonAvatar name={u.displayName} size="lg" />
                {u.activeSessions > 0 && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-success-600"
                    title={`${u.activeSessions} active session(s)`}
                    aria-label={`${u.activeSessions} active session(s)`}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-body-sm font-medium text-neutral-900" title={u.displayName}>{u.displayName}</span>
                  {u.status !== 'ACTIVE' && <StatusBadge status={u.status} />}
                </span>
                <span className="mt-0.5 block truncate text-caption text-neutral-500" title={u.jobTitle ?? u.email}>
                  {u.jobTitle ? `${u.jobTitle} · ${u.email}` : u.email}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1">
                  {u.roles.length === 0 ? (
                    <span className="rounded border border-dashed border-warning-300 px-1.5 py-px text-caption text-warning-700">No role</span>
                  ) : (
                    u.roles.map((r) => (
                      <span key={r} className={`rounded border px-1.5 py-px text-caption ${ROLE_TONE[r] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
                        {labelRole(r)}
                      </span>
                    ))
                  )}
                  <span className="ml-auto shrink-0 text-caption text-neutral-400">{relativeTime(u.lastLoginAt)}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
