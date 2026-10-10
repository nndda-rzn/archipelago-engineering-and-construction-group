import type { OrganizationNode } from '@aec/api-contracts';
import { AvatarStack, BulletBar, EmptyState, StatusBadge } from '@aec/ui';

export interface OrgOutlineProps {
  nodes: OrganizationNode[];
  /** Headcount per unit (opsional) untuk bar skala. */
  headcount?: (id: string) => number;
  /** Nama pengguna per unit (opsional) untuk AvatarStack. */
  members?: (id: string) => string[];
  onEdit?: (node: OrganizationNode) => void;
}

const rangeText = (from: string, to: string | null) => `${from.slice(0, 10)} → ${to ? to.slice(0, 10) : 'open'}`;

/**
 * Struktur organisasi sebagai **outline menjorok** (bukan tabel datar) — bentuk
 * yang benar untuk hierarki. Tiap baris menampilkan headcount sebagai bar skala
 * dan anggota sebagai avatar stack, sehingga "seberapa besar unit ini" terbaca
 * sekilas. Rekursif; kedalaman = indentasi.
 */
export function OrgOutline({ nodes, headcount, members, onEdit }: OrgOutlineProps) {
  if (nodes.length === 0) {
    return <EmptyState title="No organization units yet" description="Add the first unit to build the structure." />;
  }
  const maxHead = Math.max(1, ...nodes.flatMap((n) => [headcount?.(n.item.id) ?? 0]));
  return (
    <ul role="tree" className="flex flex-col">
      {nodes.map((n) => (
        <OrgRow key={n.item.id} node={n} depth={0} maxHead={maxHead} headcount={headcount} members={members} onEdit={onEdit} />
      ))}
    </ul>
  );
}

function OrgRow({
  node,
  depth,
  maxHead,
  headcount,
  members,
  onEdit,
}: {
  node: OrganizationNode;
  depth: number;
  maxHead: number;
  headcount?: (id: string) => number;
  members?: (id: string) => string[];
  onEdit?: (node: OrganizationNode) => void;
}) {
  const { item, children } = node;
  const count = headcount?.(item.id) ?? 0;
  const people = members?.(item.id) ?? [];
  return (
    <li role="treeitem" aria-level={depth + 1}>
      <div
        data-slot="org-row"
        className="flex items-center gap-3 border-b border-neutral-100 py-2"
        style={{ paddingLeft: `${depth * 1.25}rem` }}
      >
        <span className="w-56 shrink-0 truncate text-body-sm text-neutral-900" title={item.name}>
          {item.name}
        </span>
        <span className="shrink-0 rounded-sm bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-neutral-600">
          {item.orgType}
        </span>
        <span className="w-24 shrink-0">
          <BulletBar value={count} max={maxHead} label={`Headcount for ${item.name}`} tone="neutral" />
        </span>
        <span className="w-10 shrink-0 text-right font-mono text-caption tabular-nums text-neutral-500">{count}</span>
        <span className="hidden shrink-0 sm:block">{people.length > 0 && <AvatarStack names={people} />}</span>
        <span className="ml-auto shrink-0 font-mono text-caption tabular-nums text-neutral-500">{rangeText(item.effectiveFrom, item.effectiveTo)}</span>
        <span className="shrink-0">
          <StatusBadge status={item.status} />
        </span>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="shrink-0 rounded px-1.5 py-0.5 text-caption text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
          >
            Edit
          </button>
        )}
      </div>
      {children.length > 0 && (
        <ul role="group" className="flex flex-col">
          {children.map((c) => (
            <OrgRow key={c.item.id} node={c} depth={depth + 1} maxHead={maxHead} headcount={headcount} members={members} onEdit={onEdit} />
          ))}
        </ul>
      )}
    </li>
  );
}
