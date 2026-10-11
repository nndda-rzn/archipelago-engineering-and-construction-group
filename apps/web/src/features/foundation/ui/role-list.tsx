import { Lock, Users } from 'lucide-react';
import type { RoleWithPermissions } from '@aec/api-contracts';
import { BulletBar, EmptyState } from '@aec/ui';

const CATEGORY_TONE: Record<string, string> = {
  SYSTEM: 'border-racing-red-200 bg-racing-red-50 text-racing-red-700',
  FUNCTIONAL: 'border-info-200 bg-info-50 text-info-700',
  PROJECT: 'border-success-200 bg-success-50 text-success-700',
  CUSTOM: 'border-neutral-200 bg-neutral-100 text-neutral-600',
};

function CategoryChip({ category }: { category: string }) {
  return (
    <span className={`rounded border px-1.5 py-px text-caption capitalize ${CATEGORY_TONE[category] ?? CATEGORY_TONE.CUSTOM}`}>
      {category.toLowerCase()}
    </span>
  );
}

export interface RoleListProps {
  roles: RoleWithPermissions[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Total izin di sistem — penyebut bar cakupan. */
  permissionTotal: number;
}

/**
 * Daftar role sebagai tulang punggung (spine), bukan kartu: tiap baris dipisah
 * hairline dan membawa sinyal padat — kategori, jumlah anggota, cakupan izin
 * (bar), serta flag EMPTY (0 izin) & UNUSED (0 anggota) yang justru jadi temuan
 * utama halaman ini.
 */
export function RoleList({ roles, selectedId, onSelect, permissionTotal }: RoleListProps) {
  if (roles.length === 0) {
    return <EmptyState title="No roles" description="No roles defined yet." />;
  }
  return (
    <ul role="listbox" aria-label="Roles" className="divide-y divide-neutral-100">
      {roles.map((role) => {
        const selected = role.id === selectedId;
        const empty = role.permissionCount === 0;
        const unused = role.memberCount === 0;
        return (
          <li key={role.id}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(role.id)}
              className={`flex w-full flex-col gap-2 px-3 py-2.5 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-racing-red-600 ${
                selected ? 'bg-racing-red-50' : 'hover:bg-neutral-50'
              }`}
            >
              <span className="flex w-full items-center gap-2">
                <span className="truncate text-body-sm font-medium text-neutral-900" title={role.name}>{role.name}</span>
                {role.isSystem && <Lock className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-label="System role" />}
                {empty && <span className="ml-auto shrink-0 rounded border border-warning-300 bg-warning-50 px-1.5 py-px text-caption text-warning-700">empty</span>}
                {unused && !empty && <span className="ml-auto shrink-0 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-px text-caption text-neutral-600">unused</span>}
              </span>

              <span className="flex w-full items-center gap-2">
                <code className="truncate font-mono text-caption text-neutral-500">{role.code}</code>
                <CategoryChip category={role.category} />
                <span className="ml-auto flex shrink-0 items-center gap-1 text-caption text-neutral-500">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="font-mono tabular-nums">{role.memberCount}</span>
                </span>
              </span>

              <span className="flex w-full items-center gap-2">
                <BulletBar value={role.permissionCount} max={Math.max(permissionTotal, 1)} label={`${role.name} permission coverage`} tone={empty ? 'warning' : 'brand'} className="h-1.5" />
                <span className="shrink-0 font-mono text-caption tabular-nums text-neutral-400">{role.permissionCount}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
