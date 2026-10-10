import type { LegalEntity, LegalEntityUsage } from '@aec/api-contracts';
import { BulletBar, EntityAvatar, StackedBar, StatusBadge, type StackedSegment } from '@aec/ui';

export type LegalEntityWithMetrics = LegalEntity & { metrics?: LegalEntityUsage };

const ZERO_METRICS: LegalEntityUsage = {
  projects: 0, users: 0, organizations: 0, chartOfAccounts: 0, bankAccounts: 0, periodCloses: 0, employees: 0, equipment: 0, generatedAt: '',
};

/** Komposisi footprint sebuah entity (bagian-dari-keseluruhan per baris). */
function compositionSegments(m: LegalEntityUsage): StackedSegment[] {
  return [
    { value: m.projects, tone: 'neutral-dark', label: 'Projects' },
    { value: m.users, tone: 'neutral-mid', label: 'Users' },
    { value: m.chartOfAccounts, tone: 'neutral-light', label: 'Accounts' },
  ];
}

export interface LegalEntityRegisterProps {
  items: LegalEntityWithMetrics[];
  onRowClick: (entity: LegalEntityWithMetrics) => void;
  sort: { id: string; desc: boolean }[];
  onSortChange: (sort: { id: string; desc: boolean }[]) => void;
}

/**
 * Register legal entity — **register**, bukan kartu dan bukan tabel polos:
 * baris dipisah hairline, angka kunci di-encode grafis (bullet graph skala
 * bersama + stacked bar komposisi). Semantik `<table>` tetap dipakai agar
 * pembaca layar dapat relasi baris/kolom (WCAG 1.3.1). Baris fokusabel.
 */
export function LegalEntityRegister({ items, onRowClick, sort, onSortChange }: LegalEntityRegisterProps) {
  // Skala bersama: pangsa tiap entity atas nilai terbesar di halaman ini.
  const maxProjects = Math.max(0, ...items.map((e) => e.metrics?.projects ?? 0));
  const sorted = sort[0];
  const ariaSort = (id: string): 'ascending' | 'descending' | 'none' =>
    sorted?.id === id ? (sorted.desc ? 'descending' : 'ascending') : 'none';
  const toggleSort = (id: string) => {
    const current = sort[0];
    onSortChange(current?.id === id ? [{ id, desc: !current.desc }] : [{ id, desc: false }]);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 bg-white p-8 text-center text-body-sm text-neutral-500">
        No legal entities to show.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table aria-label="Legal entities" className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-200 text-caption uppercase text-neutral-500">
            <th scope="col" className="py-2 pr-4 font-medium">
              <button type="button" onClick={() => toggleSort('code')} aria-sort={ariaSort('code')} className="hover:text-neutral-800">
                Entity
              </button>
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">Scale</th>
            <th scope="col" className="py-2 pr-4 font-medium">Composition</th>
            <th scope="col" className="py-2 pr-4 font-medium">
              <button type="button" onClick={() => toggleSort('status')} aria-sort={ariaSort('status')} className="hover:text-neutral-800">
                Status
              </button>
            </th>
            <th scope="col" className="py-2 font-medium">Country / Currency</th>
          </tr>
        </thead>
        <tbody>
          {items.map((entity) => {
            const m = entity.metrics ?? ZERO_METRICS;
            return (
              <tr
                key={entity.id}
                tabIndex={0}
                data-slot="register-row"
                onClick={() => onRowClick(entity)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(entity);
                  }
                }}
                className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-racing-red-600"
              >
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2.5">
                    <EntityAvatar name={entity.legalName} />
                    <div className="min-w-0">
                      <div className="font-mono text-caption text-neutral-500">{entity.code}</div>
                      <div className="truncate text-body-sm text-neutral-900" title={entity.legalName}>
                        {entity.legalName}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-4">
                  <BulletBar value={m.projects} max={maxProjects} label="Scale: projects vs largest entity" tone="neutral" className="w-28" />
                  <span className="mt-1 block font-mono text-caption tabular-nums text-neutral-500">{m.projects} projects</span>
                </td>
                <td className="py-2.5 pr-4">
                  <StackedBar segments={compositionSegments(m)} format={(n) => String(n)} className="w-32" />
                </td>
                <td className="py-2.5 pr-4">
                  <StatusBadge status={entity.status} />
                </td>
                <td className="py-2.5">
                  <span className="text-body-sm text-neutral-600">{entity.country}</span>
                  <span className="ml-2 font-mono text-caption text-neutral-500">{entity.functionalCurrency}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
