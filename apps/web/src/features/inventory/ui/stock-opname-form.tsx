import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWarehouses } from '../model/warehouse.api';
import { useCreateStockOpname } from '../model/stock-opname.api';

export function OpnameForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<{ description: string; actualQuantity: number; unit: string }[]>([{ description: '', actualQuantity: 0, unit: 'EA' }]);
  const projects = useProjects({ page: 1, pageSize: 100 });
  const warehouses = useWarehouses({ page: 1, pageSize: 100 });
  const create = useCreateStockOpname();
  const projectWhs = (warehouses.data?.items ?? []).filter((w) => w.projectId === projectId || (w.warehouseType === 'CORPORATE' && !w.projectId));
  const updateLine = (index: number, patch: Partial<{ description: string; actualQuantity: number; unit: string }>) => setLines((prev) => prev.map((line, i) => i === index ? { ...line, ...patch } : line));
  const onSubmit = () => {
    if (!projectId || !warehouseId) return;
    const items = lines.filter((l) => l.description).map((l) => ({ description: l.description, bookQuantity: 0, actualQuantity: l.actualQuantity, unit: l.unit }));
    if (items.length === 0) return;
    create.mutate({ projectId, warehouseId, remark: undefined, items }, { onSuccess: () => { setLines([{ description: '', actualQuantity: 0, unit: 'EA' }]); onDone(); } });
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div><Label htmlFor="opn-project">Project</Label><select id="opn-project" value={projectId} onChange={(e) => { setProjectId(e.target.value); setWarehouseId(''); }} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body"><option value="">Pilih project...</option>{(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}</select></div>
        <div><Label htmlFor="opn-wh">Warehouse</Label><select id="opn-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body"><option value="">Pilih...</option>{projectWhs.map((w) => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}</select></div>
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500"><tr><th className="px-3 py-2">Deskripsi</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2 text-right">Qty Fisik</th><th className="px-3 py-2"></th></tr></thead>
          <tbody>{lines.map((line, index) => <tr key={index} className="border-t border-neutral-100"><td className="px-3 py-2"><Input placeholder="Deskripsi (stok book dihitung sistem)" value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} className="h-8" /></td><td className="px-3 py-2"><Input placeholder="EA" value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} className="h-8 w-20" /></td><td className="px-3 py-2"><Input type="number" min={0} value={line.actualQuantity || ''} onChange={(e) => updateLine(index, { actualQuantity: Number(e.target.value) })} className="h-8 w-28" /></td><td className="px-3 py-2 text-right"><Button type="button" variant="ghost" size="sm" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} disabled={lines.length === 1}>Hapus</Button></td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-2"><Button type="button" variant="secondary" size="sm" onClick={() => setLines((prev) => [...prev, { description: '', actualQuantity: 0, unit: 'EA' }])}>+ Tambah Baris</Button></div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="button" onClick={onSubmit} loading={create.isPending}>Catat Opname</Button></div>
      <p className="mt-2 text-caption text-neutral-500">Selisih opname otomatis membuat Stock Adjustment DRAFT (perlu approve di halaman Adjustment).</p>
    </div>
  );
}
