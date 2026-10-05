import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="mi-project">Project</Label>
        <Select
          value={projectId}
          onValueChange={(v) => { onProjectChange(v); onWarehouseChange(''); }}
        >
          <SelectTrigger id="mi-project">
            <SelectValue placeholder="Select project…" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="mi-wh">Warehouse</Label>
        <Select value={warehouseId} onValueChange={onWarehouseChange}>
          <SelectTrigger id="mi-wh">
            <SelectValue placeholder="Select warehouse…" />
          </SelectTrigger>
          <SelectContent>
            {projectWhs.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} · {w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="mi-to">Issue to</Label>
        <Input id="mi-to" placeholder="Construction Team" value={issuedTo} onChange={(e) => onIssuedToChange(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="mi-reason">Reason</Label>
        <Select value={reason} onValueChange={onReasonChange}>
          <SelectTrigger id="mi-reason">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CONSTRUCTION">CONSTRUCTION</SelectItem>
            <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
            <SelectItem value="CONSUMPTION">CONSUMPTION</SelectItem>
            <SelectItem value="OTHERS">OTHERS</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
