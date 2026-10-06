import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@aec/ui';
import type { WorkflowDefinition } from '@aec/api-contracts';
import { VERSION_STATUS_LABEL } from './workflow-labels';

export interface WorkflowDefinitionsRailProps {
  definitions: WorkflowDefinition[];
  /** Jumlah pemegang role per kode role. 0 berarti rantai akan macet. */
  holdersByRole: Record<string, number>;
  selectedId: string | null;
  onSelect: (definition: WorkflowDefinition) => void;
  className?: string;
}

/** Satu grup = satu `code` beserta seluruh versinya. */
interface Group {
  code: string;
  transactionType: string;
  versions: WorkflowDefinition[];
  /** Versi ACTIVE yang benar-benar dipakai runtime, bila ada. */
  active: WorkflowDefinition | null;
}

/**
 * Koleksi definisi, **dikelompokkan per kode**.
 *
 * Alasannya domain, bukan estetika: `PR_APPROVAL` v3/v2/v1 bukan tiga workflow
 * berbeda — ia satu workflow dengan riwayat. Daftar rata membuat tiga baris
 * bersaudara yang terlihat setara, sehingga mata tidak tahu mana yang dipakai.
 * Mengelompokkan menurut `code` mengembalikan struktur yang sebenarnya, dan
 * memberi satu tempat untuk menonjolkan versi ACTIVE.
 *
 * Hierarki di dalam grup: versi ACTIVE memimpin (tebal + titik penuh), DRAFT
 * sekunder, ARCHIVED resesif. Bobot yang membedakan, bukan warna baru — sesuai
 * aturan proyek bahwa merah hanya untuk aksi, bukan penanda status.
 *
 * Setiap versi membawa **coverage** (`punya pemegang / total langkah`) karena
 * pertanyaan nyata saat memilih workflow adalah "apakah rantai ini bisa jalan",
 * bukan "status apa". Coverage selalu disertai ikon + teks, jadi warna bukan
 * satu-satunya sinyal.
 */
export function WorkflowDefinitionsRail({
  definitions,
  holdersByRole,
  selectedId,
  onSelect,
  className,
}: WorkflowDefinitionsRailProps) {
  const groups = useMemo(() => groupByCode(definitions), [definitions]);
  // Grup terbuka secara default; hanya yang pengguna tutup yang tercatat.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (code: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  return (
    <ul className={cn('space-y-3', className)}>
      {groups.map((group) => {
        const open = !collapsed.has(group.code);
        return (
          <li key={group.code}>
            <button
              type="button"
              onClick={() => toggle(group.code)}
              aria-expanded={open}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                'hover:bg-neutral-50 transition-colors duration-fast',
              )}
            >
              <ChevronRight
                className={cn('h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-fast', open && 'rotate-90')}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate font-mono text-body-sm text-neutral-800" title={group.code}>
                {group.code}
              </span>
              <span className="shrink-0 font-mono text-caption text-neutral-500">{typeAbbrev(group.transactionType)}</span>
            </button>

            {open && (
              <ul className="mt-0.5 space-y-0.5 pl-3" aria-label={`${group.code} versions`}>
                {group.versions.map((definition) => (
                  <li key={definition.id}>
                    <VersionRow
                      definition={definition}
                      holdersByRole={holdersByRole}
                      selected={definition.id === selectedId}
                      isActive={definition.status === 'ACTIVE'}
                      onSelect={() => onSelect(definition)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function VersionRow({
  definition,
  holdersByRole,
  selected,
  isActive,
  onSelect,
}: {
  definition: WorkflowDefinition;
  holdersByRole: Record<string, number>;
  selected: boolean;
  isActive: boolean;
  onSelect: () => void;
}) {
  const total = definition.steps.length;
  const covered = definition.steps.filter((s) => (holdersByRole[s.approverRoleCode] ?? 0) > 0).length;
  const uncovered = total - covered;
  const statusLabel = VERSION_STATUS_LABEL[definition.status] ?? definition.status;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      aria-label={
        `${definition.code} version ${definition.version}, ${statusLabel}, ` +
        `${covered} of ${total} step${total === 1 ? '' : 's'} have an approver` +
        `${uncovered > 0 ? `, ${uncovered} would stall the chain` : ''}`
      }
      className={cn(
        'grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-2 rounded-md py-1.5 pl-2 pr-1.5 text-left',
        'transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
        // Seleksi lewat LATAR, konsisten dengan sidebar nav dan daftar rantai.
        // Sebelumnya memakai `border-l-2`, satu-satunya di aplikasi.
        selected ? 'bg-neutral-100' : 'hover:bg-neutral-50',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          isActive ? 'bg-neutral-800' : 'border border-neutral-300 bg-white',
        )}
      />
      <span
        className={cn(
          'shrink-0 whitespace-nowrap font-mono text-caption tabular-nums',
          isActive ? 'font-semibold text-neutral-900' : 'text-neutral-600',
        )}
      >
        v{definition.version}
      </span>
      <span className={cn('min-w-0 truncate text-caption', isActive ? 'font-medium text-neutral-900' : 'text-neutral-500')}>
        {statusLabel}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {uncovered > 0 && <AlertTriangle className="h-3 w-3 shrink-0 text-destructive-500" aria-hidden="true" />}
        <span
          className={cn(
            'whitespace-nowrap font-mono text-caption tabular-nums',
            uncovered > 0 ? 'text-destructive-700' : 'text-neutral-500',
          )}
        >
          {covered}/{total}
        </span>
      </span>
    </button>
  );
}

/** Kelompokkan definisi per `code`; di dalam grup, versi terbaru lebih dulu. */
export function groupByCode(definitions: WorkflowDefinition[]): Group[] {
  const byCode = new Map<string, WorkflowDefinition[]>();
  for (const definition of definitions) {
    const list = byCode.get(definition.code) ?? [];
    list.push(definition);
    byCode.set(definition.code, list);
  }

  return [...byCode.entries()]
    .map(([code, versions]) => {
      const sorted = [...versions].sort((a, b) => b.version - a.version);
      return {
        code,
        transactionType: sorted[0]!.transactionType,
        versions: sorted,
        active: sorted.find((v) => v.status === 'ACTIVE') ?? null,
      };
    })
    // ACTIVE lebih dulu, lalu DRAFT, lalu yang hanya berisi arsip.
    .sort((a, b) => rank(a) - rank(b) || a.code.localeCompare(b.code));
}

function rank(group: Group): number {
  if (group.active) return 0;
  if (group.versions.some((v) => v.status === 'DRAFT')) return 1;
  return 2;
}

/** `PurchaseRequisition` → `PR`, `PurchaseOrder` → `PO`. */
function typeAbbrev(transactionType: string): string {
  if (transactionType === 'PurchaseRequisition') return 'PR';
  if (transactionType === 'PurchaseOrder') return 'PO';
  return transactionType.slice(0, 2).toUpperCase();
}
