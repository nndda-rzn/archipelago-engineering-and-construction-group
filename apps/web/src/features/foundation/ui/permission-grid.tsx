import { useMemo, useState } from 'react';
import type { PermissionCatalog } from '@aec/api-contracts';
import { Badge, Button, Input, labelResource } from '@aec/ui';

export interface PermissionGridProps {
  /** Katalog lengkap izin (semua resource × action). */
  catalog: PermissionCatalog[];
  /** Kode izin yang sedang terpilih. */
  value: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
}

/** Label grup domain — dibaca manusia. */
const GROUP_LABELS: Record<string, string> = {
  FOUNDATION: 'Foundation', PROCUREMENT: 'Procurement', FINANCE: 'Finance', TREASURY: 'Treasury',
  PROJECT: 'Project', CONSTRUCTION: 'Construction', INVENTORY: 'Inventory', HSE: 'HSE',
  QUALITY: 'Quality', COMMERCIAL: 'Commercial', ANALYTICS: 'Analytics', GOVERNANCE: 'Governance',
  HCM: 'HCM', ENGINEERING: 'Engineering', MASTER_DATA: 'Master Data',
};

interface DomainGroup {
  group: string;
  resources: string[];
  actions: string[];
  cells: Map<string, PermissionCatalog>;
}

/** Kelompokkan katalog menjadi matriks resource × action per domain. */
function buildGroups(catalog: PermissionCatalog[]): DomainGroup[] {
  const byGroup = new Map<string, PermissionCatalog[]>();
  for (const p of catalog) {
    const g = p.group ?? 'MASTER_DATA';
    const list = byGroup.get(g) ?? [];
    list.push(p);
    byGroup.set(g, list);
  }
  return [...byGroup.entries()]
    .map(([group, items]) => {
      const cells = new Map<string, PermissionCatalog>();
      const resourceSet = new Set<string>();
      const actionSet = new Set<string>();
      for (const p of items) {
        cells.set(`${p.resource}.${p.action}`, p);
        resourceSet.add(p.resource);
        actionSet.add(p.action);
      }
      return { group, resources: [...resourceSet].sort(), actions: [...actionSet].sort(), cells };
    })
    .sort((a, b) => a.group.localeCompare(b.group));
}

/**
 * Matriks izin editable: baris = resource, kolom = action, per kelompok domain.
 * Sel yang berlaku dapat di-toggle; sel yang tak berlaku dibiarkan kosong. Ini
 * menjawab "sebagai apa" secara visual dan sekaligus menjadi alat kerja — bukan
 * daftar checkbox panjang.
 */
export function PermissionGrid({ catalog, value, onChange, disabled }: PermissionGridProps) {
  const [search, setSearch] = useState('');
  const granted = useMemo(() => new Set(value), [value]);
  const groups = useMemo(() => buildGroups(catalog), [catalog]);

  const q = search.trim().toLowerCase();
  const visible = useMemo(
    () => groups
      .map((g) => ({ ...g, resources: g.resources.filter((r) => !q || labelResource(r).toLowerCase().includes(q) || r.toLowerCase().includes(q)) }))
      .filter((g) => g.resources.length > 0),
    [groups, q],
  );

  const toggle = (code: string) => {
    const next = new Set(granted);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange([...next]);
  };

  const toggleResource = (g: DomainGroup, resource: string) => {
    const codes = g.actions.map((a) => `${resource}.${a}`).filter((c) => g.cells.has(c));
    const allOn = codes.every((c) => granted.has(c));
    const next = new Set(granted);
    for (const c of codes) {
      if (allOn) next.delete(c);
      else next.add(c);
    }
    onChange([...next]);
  };

  const toggleGroup = (g: DomainGroup) => {
    const codes = [...g.cells.keys()];
    const allOn = codes.every((c) => granted.has(c));
    const next = new Set(granted);
    for (const c of codes) {
      if (allOn) next.delete(c);
      else next.add(c);
    }
    onChange([...next]);
  };

  const total = catalog.length;
  const selected = granted.size;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56 max-w-full">
          <Input type="search" aria-label="Search resources" placeholder="Search resource…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-1 items-center gap-3">
          <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-neutral-100" role="img" aria-label={`${selected} of ${total} permissions granted`}>
            <div className="h-full rounded-full bg-racing-red-600 transition-[width] duration-fast" style={{ width: `${total > 0 ? (selected / total) * 100 : 0}%` }} />
          </div>
          <span className="shrink-0 font-mono text-caption tabular-nums text-neutral-600">{selected}/{total}</span>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-neutral-100">
        {visible.map((g) => {
          const codes = [...g.cells.keys()];
          const on = codes.filter((c) => granted.has(c)).length;
          return (
            <section key={g.group} className="py-3 first:pt-0 last:pb-0" aria-label={GROUP_LABELS[g.group] ?? g.group}>
              <div className="mb-2 flex items-center gap-2">
                <h4 className="text-body-sm font-medium text-neutral-900">{GROUP_LABELS[g.group] ?? g.group}</h4>
                <span className="font-mono text-caption tabular-nums text-neutral-400">{on}/{codes.length}</span>
                <Button type="button" variant="ghost" size="sm" className="ml-auto" disabled={disabled} onClick={() => toggleGroup(g)}>
                  {on === codes.length ? 'Clear group' : 'Select group'}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="border-collapse text-caption">
                  <caption className="sr-only">Permissions for {GROUP_LABELS[g.group] ?? g.group}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="sticky left-0 bg-white px-1 py-1 text-left font-medium text-neutral-400">Resource</th>
                      {g.actions.map((a) => (
                        <th key={a} scope="col" className="px-1 py-1 text-center font-medium text-neutral-400" title={a}>
                          <span className="inline-block max-h-16 [writing-mode:vertical-rl] text-[10px] tracking-wide">{a}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.resources.map((r) => (
                      <tr key={r} className="border-t border-neutral-100">
                        <th scope="row" className="sticky left-0 bg-white py-0.5 pr-3 text-left font-normal text-neutral-700">
                          <button type="button" className="truncate hover:text-neutral-950 hover:underline" disabled={disabled} onClick={() => toggleResource(g, r)} title={`Toggle all for ${labelResource(r)}`}>
                            {labelResource(r)}
                          </button>
                        </th>
                        {g.actions.map((a) => {
                          const cell = g.cells.get(`${r}.${a}`);
                          if (!cell) return <td key={a} className="px-1 py-0.5 text-center"><span className="mx-auto block h-4 w-4" aria-hidden="true" /></td>;
                          const has = granted.has(cell.code);
                          return (
                            <td key={a} className="px-1 py-0.5 text-center">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={has}
                                aria-label={`${cell.code}${cell.isSensitive ? ' (sensitive)' : ''}`}
                                disabled={disabled}
                                onClick={() => toggle(cell.code)}
                                title={cell.isSensitive ? `${cell.code} — sensitive` : cell.code}
                                className={`mx-auto flex h-4 w-4 items-center justify-center rounded-sm border transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-red-600/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                                  has ? 'border-racing-red-600 bg-racing-red-600' : 'border-neutral-300 bg-white hover:border-neutral-400'
                                }`}
                              >
                                {has && <span className="text-[10px] font-bold leading-none text-white" aria-hidden="true">✓</span>}
                                {!has && cell.isSensitive && <span className="h-1 w-1 rounded-full bg-warning-500" aria-hidden="true" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
        {visible.length === 0 && <p className="py-6 text-center text-body-sm text-neutral-500">No resources match “{search}”.</p>}
      </div>

      <p className="flex items-center gap-2 text-caption text-neutral-500">
        <Badge variant="warning">sensitive</Badge> ditandai titik kuning pada sel yang belum dipilih.
      </p>
    </div>
  );
}
