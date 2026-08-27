import { Input, Label } from '@aec/ui';
import type { Project } from '@aec/api-contracts';
import type { Warehouse } from '@aec/api-contracts';

export function IssueHeaderFields({
  projectId,
  onProjectChange,
  warehouseId,
  onWarehouseChange,
  issuedTo,
  onIssuedToChange,
  reason,
  onReasonChange,
  projects,
  warehouses,
}: {
  projectId: string;
  onProjectChange: (v: string) => void;
  warehouseId: string;
  onWarehouseChange: (v: string) => void;
  issuedTo: string;
  onIssuedToChange: (v: string) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  projects: Project[];
  warehouses: Warehouse[];
}) {
  const projectWhs = warehouses.filter((w) => w.projectId === projectId || (w.warehouseType === 'CORPORATE' && !w.projectId));

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="mi-project">Project</Label>
        <select
          id="mi-project"
          value={projectId}
          onChange={(e) => { onProjectChange(e.target.value); onWarehouseChange(''); }}
          className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
        >
          <option value="">Pilih project…</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
      </div>
      <div>
        <Label htmlFor="mi-wh">Warehouse</Label>
        <select
          id="mi-wh"
          value={warehouseId}
          onChange={(e) => onWarehouseChange(e.target.value)}
          className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
        >
          <option value="">Pilih warehouse…</option>
          {projectWhs.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
        </select>
      </div>
      <div>
        <Label htmlFor="mi-to">Issue ke</Label>
        <Input id="mi-to" placeholder="Tim Konstruksi" value={issuedTo} onChange={(e) => onIssuedToChange(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="mi-reason">Alasan</Label>
        <select id="mi-reason" value={reason} onChange={(e) => onReasonChange(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
          <option value="CONSTRUCTION">CONSTRUCTION</option>
          <option value="MAINTENANCE">MAINTENANCE</option>
          <option value="CONSUMPTION">CONSUMPTION</option>
          <option value="OTHERS">OTHERS</option>
        </select>
      </div>
    </div>
  );
}
